#!/usr/bin/env python3
"""Gera o site estático multilíngue e multi-receita em docs/ (publicado pelo GitHub Pages).

    python3 build.py            # páginas + sitemap + robots + raiz
    python3 build.py --images   # também regenera as imagens (og, receita, ícones)
    python3 build.py --scene    # regenera as derivadas do cenário (AVIF/WebP/JPG) a partir de src/photos/originals/

Fontes:
  src/template.html, src/style.css, src/illustrations.js   layout e lógica
  src/i18n/<lang>.json                                     textos comuns do site
  src/recipes/<id>/recipe.json                             configuração da receita (padrões, cronograma, timer…)
  src/recipes/<id>/<lang>.json                             textos da receita

Cada página é pré-renderizada no Chrome headless para que passos, quantidades e o
JSON-LD da receita já estejam no HTML que o Google lê.
URLs: /<lang>/ para a receita principal (slug vazio) e /<lang>/<slug>/ para as demais.
"""
import html, json, re, shutil, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).parent
SRC, OUT = ROOT / 'src', ROOT / 'docs'
DOMAIN = 'https://napoliprotocol.com'
LANGS = ['pt', 'en']                              # ordem do menu
HREFLANG = {'pt': 'pt', 'en': 'en'}
RETIRED = {'es': 'en', 'it': 'en', 'zh': 'en'}   # idiomas removidos: endereços antigos redirecionam
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
ROOT_DESC = ('Neapolitan and New York pizza recipes with an animated step-by-step protocol, dough calculator, schedule and oven guide. '
             'Receita de pizza napolitana passo a passo. By Jhonathan Sousa.')

I18N = {l: json.loads((SRC / 'i18n' / f'{l}.json').read_text('utf-8')) for l in LANGS}
RECIPES = sorted((json.loads(p.read_text('utf-8')) for p in (SRC / 'recipes').glob('*/recipe.json')), key=lambda c: c['order'])
RTEXT = {c['id']: {l: json.loads((SRC / 'recipes' / c['id'] / f'{l}.json').read_text('utf-8')) for l in LANGS} for c in RECIPES}

esc = lambda s: html.escape(s, quote=True)
PHOTOS = json.loads((SRC / 'photos' / 'photos.json').read_text('utf-8'))   # fotos reais (Wikimedia Commons) com crédito


def credit_links(key, l, label=None):
    p = PHOTOS[key]; label = label or I18N[l]['html']['photo']
    credit = f'{label}: <a href="{p["source"]}" target="_blank" rel="noopener">{esc(p["author"])}</a>'
    if p['license_url']: credit += f', <a href="{p["license_url"]}" target="_blank" rel="noopener license">{esc(p["license"])}</a>'
    else: credit += f', {esc(p["license"])}'
    return credit


def credit_html(key, l, cls, label=None):
    return f'<p class="{cls}">{credit_links(key, l, label)}</p>'


def figure(key, l, cls, eager=False):
    p = PHOTOS[key]
    credit = credit_links(key, l)
    return (f'<figure class="{cls}"><img src="/img/photos/{key}-800.jpg" srcset="/img/photos/{key}-800.jpg 800w, /img/photos/{key}-1400.jpg 1400w" '
            f'sizes="(max-width: 960px) 100vw, 640px" width="{p["w"]}" height="{p["h"]}" alt="{esc(p["cap"][l])}" loading="{"eager" if eager else "lazy"}" decoding="async">'
            f'<figcaption>{esc(p["cap"][l])} <small>{credit}</small></figcaption></figure>')
img = lambda name: f'{DOMAIN}/img/{name}'
path = lambda l, c: f'/{l}/' + (f'{c["slug"]}/' if c['slug'] else '')
url = lambda l, c: DOMAIN + path(l, c)
prefix = lambda c: f'{c["id"]}-' if c['slug'] else ''          # nomes de imagem (napolitana mantém os antigos)
xdefault = lambda c: f'{DOMAIN}/' if not c['slug'] else url('en', c)


def merge(a, b):
    """Mescla b sobre a (dicts recursivos; listas e valores são substituídos)."""
    out = dict(a)
    for k, v in b.items():
        out[k] = merge(out[k], v) if isinstance(v, dict) and isinstance(out.get(k), dict) else v
    return out


def chrome(args):
    # headless novo + virtual time, sem perfil temporário (com --user-data-dir ele não encerra)
    return subprocess.run([CHROME, '--headless=new', '--virtual-time-budget=4000', '--disable-gpu',
                           '--hide-scrollbars', '--no-first-run', *args],
                          capture_output=True, text=True, timeout=90)


def lang_links(cur, c, cls):
    items = []
    for l in LANGS:
        m = I18N[l]['meta']
        cur_attr = ' aria-current="page"' if l == cur else ''
        a = f'<a href="{path(l, c)}" hreflang="{HREFLANG[l]}" lang="{m["htmlLang"]}" data-setlang="{l}"{cur_attr}>'
        items.append(f'<li>{a}{m["label"]}<span>{m["short"]}</span></a></li>' if cls == 'menu' else f'{a}{m["label"]}</a>')
    return items


def recipe_links(l, cur, cls):
    out = []
    for c in RECIPES:
        name = esc(RTEXT[c['id']][l]['html']['name'])
        badge = f' <em>v{c["version"]}</em>' if c['version'].startswith('0.') else ''
        cur_attr = ' aria-current="page"' if c['id'] == cur['id'] else ''
        out.append(f'<a href="{path(l, c)}"{cur_attr}>{name}{badge if cls == "tabs" else ""}</a>')
    return ''.join(out)


def head(l, c, d):
    m = d['meta']
    alts = '\n'.join(f'<link rel="alternate" hreflang="{HREFLANG[x]}" href="{url(x, c)}">' for x in LANGS)
    og_alt = '\n'.join(f'<meta property="og:locale:alternate" content="{I18N[x]["meta"]["ogLocale"]}">' for x in LANGS if x != l)
    og = img(f'og-{prefix(c)}{l}.png')
    return f'''<title>{esc(m["title"])}</title>
<meta name="description" content="{esc(m["description"])}">
<meta name="author" content="Jhonathan Sousa">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="theme-color" content="#120E0C">
<link rel="canonical" href="{url(l, c)}">
{alts}
<link rel="alternate" hreflang="x-default" href="{xdefault(c)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="NapoliProtocol">
<meta property="og:locale" content="{m["ogLocale"]}">
{og_alt}
<meta property="og:title" content="{esc(m["ogTitle"])}">
<meta property="og:description" content="{esc(m["description"])}">
<meta property="og:url" content="{url(l, c)}">
<meta property="og:image" content="{og}">
<meta property="og:image:secure_url" content="{og}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{esc(m["imgAlt"])}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(m["ogTitle"])}">
<meta name="twitter:description" content="{esc(m["description"])}">
<meta name="twitter:image" content="{og}">
{scene_preload(c)}'''



# ---------- cenário: contrato, CSS da câmera e markup ----------
TAKES = ('hero', 'tempo', 'gesto', 'fogo', 'fim')
MOBILE_MQ = '(max-width: 820px)'
EASE_CAM = 'var(--ease-cam)'


def scene_photos(c):
    """Fotos do cenário na ordem do primeiro uso (a do herói primeiro)."""
    out = []
    for t in TAKES:
        k = c['scene']['takes'][t]['photo']
        if k not in out: out.append(k)
    return out


def take_vars(c, take, key, v):
    """Variáveis CSS (foco convertido para a variante servida) da tomada `take` da foto `key`."""
    t = c['scene']['takes'][take][v]; p = PHOTOS[key]
    crop = p.get('crop_d', CROP_FULL) if v == 'd' else p['crop_m']
    fx, fy = (t['f'][0] - crop[0]) / crop[2], (t['f'][1] - crop[1]) / crop[3]
    f = lambda x: f'{x:.4f}'.rstrip('0').rstrip('.') or '0'
    css = f'--fx:{f(fx)};--fy:{f(fy)};--ax:{f(t["a"][0] / 100)};--ay:{f(t["a"][1] / 100)};--s:{f(t["s"])};'
    if t.get('bleed') == 'l': css += '--txmin:-99999px;--txmax:99999px;--bl:1;'
    if t.get('bleed') == 't': css += '--tymin:-99999px;--tymax:99999px;--bt:1;'
    return css, (fx, fy)


def scene_validate(c):
    sc, name, man = c.get('scene'), c['id'], load_manifest()
    assert sc and set(sc['takes']) == set(TAKES), f'{name}: scene.takes deve ter exatamente {TAKES}'
    for t in TAKES:
        tk = sc['takes'][t]; key = tk['photo']
        assert key in PHOTOS, f'{name}/{t}: foto {key} não está em photos.json'
        p = PHOTOS[key]
        for fld in ('author', 'license', 'source', 'ow', 'oh', 'crop_m'):
            assert p.get(fld), f'{name}/{t}: {key} sem "{fld}" em photos.json'
        assert tk['d']['s'] <= 1.30, f'{name}/{t}: desktop com s={tk["d"]["s"]} > 1,30 (nitidez: arquivo máximo 3200 px)'
        for v in ('d', 'm'):
            _, (fx, fy) = take_vars(c, t, key, v)
            assert 0 <= fx <= 1 and 0 <= fy <= 1, f'{name}/{t}/{v}: foco fora do recorte ({fx:.2f}, {fy:.2f})'
            assert key in man and v in man[key] and man[key][v]['files'], f'{name}/{t}: {key} sem derivadas no manifesto (rode python3 build.py --scene)'
            for fmt, W in (('avif', None), ('jpg', JPG_W[v])):
                fs = [f for f in man[key][v]['files'] if f['fmt'] == fmt and (W is None or f['w'] == W)]
                assert fs, f'{name}/{t}: {key}-{v} sem {fmt}'
                for f in fs: assert (SCENE_OUT / f'{key}-{v}-{f["w"]}.{fmt}').exists(), f'arquivo ausente: {key}-{v}-{f["w"]}.{fmt}'
    for o in RECIPES:
        if o['id'] != c['id']: assert o['scene']['takes']['hero']['photo'] != sc['takes']['hero']['photo'], f'{name}: foto do herói igual à de {o["id"]}'


def scene_css(c):
    man, takes = load_manifest(), c['scene']['takes']
    photos = scene_photos(c)
    sel = lambda t, k: (f'.scene:not([data-take]) .ph-{k},.scene[data-take={t}] .ph-{k}' if t == 'hero' else f'.scene[data-take={t}] .ph-{k}')
    on = f'opacity:1;transition:translate 1.4s {EASE_CAM},scale 1.4s {EASE_CAM},opacity .7s linear'
    out = []
    for v in ('d', 'm'):
        shrink = {}
        rules = [f'.ph-{k}{{--A:{man[k][v]["A"]}}}' for k in photos]
        for t in TAKES:
            for k in photos:
                if takes[t]['photo'] == k: use, extra = t, on
                else:   # foto inativa: já no enquadramento da próxima tomada em que aparece (ou da última anterior)
                    nxt = [x for x in TAKES[TAKES.index(t) + 1:] if takes[x]['photo'] == k] or [x for x in TAKES[:TAKES.index(t)] if takes[x]['photo'] == k][-1:]
                    use, extra = nxt[0], ''
                rules.append(f'{sel(t, k)}{{{take_vars(c, use, k, v)[0]}{extra}}}')
                if v == 'm' and takes[use]['m']['s'] < 1: shrink.setdefault(int(man[k]['m']['A'] * takes[use]['m']['s'] * 100) + 1, []).append(sel(t, k))
        for thr, sels in sorted(shrink.items()):   # s < 1 só cobre a largura em telas estreitas: acima desta proporção a imagem volta a "cover"
            rules.append(f'@media (min-aspect-ratio:{thr}/100){{\n' + '\n'.join(f'{x}{{--s:1}}' for x in sels) + '\n}')
        out.append('\n'.join(rules) if v == 'd' else f'@media {MOBILE_MQ}{{\n' + '\n'.join(rules) + '\n}')
    return '<style id="scene-css">\n' + '\n'.join(out) + '\n</style>'


def scene_sizes(man, key, v):
    return 'max(100vw, calc(100vh * %s))' % man[key]['m']['A'] if v == 'm' else '100vw'


def scene_sources(key, v):
    """Lista de (type, srcset, sizes, media) da variante; usada pelo <picture> e pelo preload (mesma função: não podem divergir)."""
    man = load_manifest(); files = man[key][v]['files']; out = []
    for fmt in ('avif', 'jpg'):
        fs = [f for f in files if f['fmt'] == fmt]
        if not fs: continue
        out.append((None if fmt == 'jpg' else f'image/{fmt}', ', '.join(f'/img/scene/{key}-{v}-{f["w"]}.{fmt} {f["w"]}w' for f in fs),
                    scene_sizes(man, key, v), MOBILE_MQ if v == 'm' else None))
    return out


def scene_picture(key, lazy):
    man = load_manifest(); ss = 'data-srcset' if lazy else 'srcset'
    h = ['<picture>']
    for v in ('m', 'd'):
        for typ, srcset, sizes, media in scene_sources(key, v):
            h.append('<source' + (f' media="{media}"' if media else '') + (f' type="{typ}"' if typ else '') + f' {ss}="{srcset}" sizes="{sizes}">')
    j = next(f for f in man[key]['d']['files'] if f['fmt'] == 'jpg')
    jp = f'/img/scene/{key}-d-{j["w"]}.jpg'
    h.append(f'<img {"data-src" if lazy else "src"}="{jp}" width="{j["w"]}" height="{j["h"]}" alt="" decoding="async"' + ('' if lazy else ' fetchpriority="high"') + '>')
    h.append('</picture>')
    return ''.join(h)


def scene_markup(c):
    photos = scene_photos(c)
    return '<div class="scene" aria-hidden="true">' + ''.join(f'<div class="ph ph-{k}">{scene_picture(k, lazy=i > 0)}</div>' for i, k in enumerate(photos)) + '</div>'


def scene_preload(c):
    key, man = c['scene']['takes']['hero']['photo'], load_manifest()
    out = []
    for v, media in (('m', '(max-width: 820px)'), ('d', '(min-width: 821px)')):
        typ, srcset, sizes, _ = scene_sources(key, v)[0]
        assert typ == 'image/avif'
        out.append(f'<link rel="preload" as="image" type="image/avif" fetchpriority="high" media="{media}" imagesrcset="{srcset}" imagesizes="{sizes}">')
    return '\n'.join(out)


emph = lambda s: re.sub(r'\*(.+?)\*', r'<em>\1</em>', esc(s))


def win_html(c, l, d, take, chap):
    sc = d['scene'][take]; key = c['scene']['takes'][take]['photo']; hero = c['scene']['takes']['hero']['photo']
    other = key != hero
    return (f'<section class="win" data-take="{take}"' + (f' data-photo="{key}"' if other else '') + f' aria-label="{esc(d["html"][chap])}">'
            f'<div class="wrap"><p class="pill">{esc(d["html"][chap])}</p><p class="win-h">{emph(sc["h"])}</p><p class="win-p">{esc(sc["p"])}</p></div>'
            + (credit_html(key, l, 'credit') if other else '') + '</section>')


def timer_markup(t):
    pct = lambda s: f'{s / t["max"] * 100:.2f}%'
    zone = lambda cls, a, b: f'<div class="z {cls}" style="left:{pct(a)};width:{pct(b - a)}"></div>'
    mm = t['max'] >= 300
    lab = lambda s: f'{s // 60}' if mm else f'{s}'
    ticks = [f'<span>{lab(s)}</span>' for s in t['ticks']]
    ticks[-1] = f'<span>{lab(t["ticks"][-1])} {"min" if mm else "s"}</span>'
    clock0 = '0:00<small> min</small>' if mm else '0<small> s</small>'
    return zone('turn', *t['turn']) + zone('ok', *t['ok']), ''.join(ticks), clock0


def page(l, c):
    d = merge(I18N[l], RTEXT[c['id']][l])
    tpl = (SRC / 'template.html').read_text('utf-8')
    js = dict(d['js'])
    js['photos'] = {sid: figure(k, l, 'ref') for sid, k in c.get('photos', {}).get('steps', {}).items()}
    js['cfg'] = {k: c[k] for k in ('id', 'targetSize', 'scenes', 'def', 'ls', 'features', 'warn', 'sched', 'timer', 'ld')}
    js['ld'] = dict(js['ld'], url=url(l, c), inLanguage=HREFLANG[l],
                    images=[img(f'recipe-{prefix(c)}{l}-{r}.png') for r in ('1x1', '4x3', '16x9')])
    assert len(js['sched']['ev']) == len(c['sched']), f'{c["id"]}/{l}: cronograma'
    globe = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" fill="none" stroke="currentColor" stroke-width="2"/></svg>'
    menu = (f'<details class="lang"><summary aria-label="{esc(d["html"]["nav.lang"])}">{globe}{d["meta"]["short"]}</summary>'
            f'<ul>{"".join(lang_links(l, c, "menu"))}</ul></details>')
    f = c['features']
    scene_validate(c)
    tk = c['scene']['takes']; fin_key = tk['fim']['photo']; name = d['html']['name']
    h1 = esc(d['html']['hero.h1']).replace(esc(name), f'<em>{esc(name)}</em>', 1)
    assert '<em>' in h1, f'{c["id"]}/{l}: nome "{name}" não aparece no h1'
    about = c.get('photos', {}).get('about', [])
    zones, scale, clock0 = timer_markup(c['timer'])
    rep = {
        'HTML_LANG': d['meta']['htmlLang'], 'LANG': l, 'HEAD': head(l, c, d), 'LANG_MENU': menu,
        'FOOT_LANGS': ''.join(lang_links(l, c, 'foot')),
        'RECIPE_TABS': recipe_links(l, c, 'tabs'), 'FOOT_RECIPES': recipe_links(l, c, 'foot'),
        'NSTEPS': str(sum(len(day['items']) for day in js['steps'])),
        'REF_W': esc(c['ref']['w']), 'REF_SALT': esc(c['ref']['salt']), 'TARGET': esc(c['targetSize']),
        'SPLIT_CLASS': '' if f['waterSplit'] else ' two',
        'TIMER_ZONES': zones, 'TIMER_SCALE': scale, 'CLOCK0': clock0,
        'CSS': re.sub(r'\n\s*', '\n', re.sub(r'/\*.*?\*/', '', (SRC / 'style.css').read_text('utf-8'), flags=re.S)).strip(), 'IL': (SRC / 'illustrations.js').read_text('utf-8'),
        'PLAYER_JS': (SRC / 'player.js').read_text('utf-8').replace('</', '<\\/'), 'PLAYER_STAGE': (SRC / 'player-stage.svg').read_text('utf-8'),
        'RULES': ''.join(f'<li>{esc(r)}</li>' for r in d['rules']),
        'GLOSSARY': ''.join(f'<div class="card"><dt>{esc(a)}</dt><dd>{esc(b)}</dd></div>' for a, b in d['glossary']),
        'T_JSON': json.dumps(js, ensure_ascii=False).replace('</', '<\\/'),
        'ABOUT_SITE': ''.join(f'<p>{esc(x)}</p>' for x in d['about']['site']),
        'ABOUT_PIZZA': ''.join(f'<p>{esc(x)}</p>' for x in d['about']['pizza']),
        'ABOUT_MAIN': figure(about[0], l, 'aph', eager=False) if about else '',
        'ABOUT_PHOTOS': ''.join(figure(k, l, 'aph') for k in about[1:]),
        'SCENE': scene_markup(c), 'SCENE_CSS': scene_css(c), 'HTML_STYLE': f'style="--scrim-base:{c["scene"]["scrim"]}"',
        'SCENE_JS': (SRC / 'scene.js').read_text('utf-8').replace('</', '<\\/'),
        'H1': h1, 'HERO_CREDIT': credit_html(tk['hero']['photo'], l, 'credit'),
        'WIN_TEMPO': win_html(c, l, d, 'tempo', 'chap.2'), 'WIN_GESTO': win_html(c, l, d, 'gesto', 'chap.3'), 'WIN_FOGO': win_html(c, l, d, 'fogo', 'chap.4'),
        'FIN_H': emph(d['scene']['fim']['h']), 'FIN_PHOTO_ATTR': f'data-photo="{fin_key}"' if fin_key != tk['hero']['photo'] else '',
        'FIN_CREDIT': credit_html(fin_key, l, 'credit-foot', d['html']['foot.bgphoto']),
        'ABOUT_FACTS': ''.join(f'<div class="fact"><b>{esc(v)}</b><span>{esc(t)}</span></div>' for v, t in d['about']['facts']),
    }
    # blocos condicionais {{#pf}}…{{/pf}}: só entram no HTML se a receita usa o recurso
    on = {'pf': f['preferment'], 'sugar': f['sugar'], 'wsplit': f['waterSplit']}
    block = re.compile(r'\{\{#(\w+)\}\}((?:(?!\{\{#).)*?)\{\{/\1\}\}', re.S)
    while block.search(tpl):
        tpl = block.sub(lambda m: m.group(2) if on[m.group(1)] else '', tpl)
    missing = []
    def sub(m):
        k = m.group(1)
        if k in rep: return rep[k]
        if k in d['html']: return esc(d['html'][k])
        if k.startswith('about.') and k[6:] in d['about']: return esc(d['about'][k[6:]])
        missing.append(k); return m.group(0)
    out = re.sub(r'\{\{([\w.]+)\}\}', sub, tpl)
    assert not missing, f'{c["id"]}/{l}: chaves ausentes {missing}'
    return out


def prerender(p):
    r = chrome(['--dump-dom', p.as_uri() + '?prerender=1'])
    dom = r.stdout
    assert 'id="ld-recipe"' in dom and 'class="step"' in dom, f'pré-render falhou: {p}\n{r.stderr[-500:]}'
    # estado que depende do relógio do build: deixa o JS do visitante preencher
    dom = re.sub(r'(<html[^>]*?) data-theme="\w+"', r'\1', dom, count=1)
    def swap(name, pat, rep, flags=re.S):
        nonlocal dom
        dom, n = re.subn(pat, rep, dom, count=1, flags=flags)
        assert n == 1, f'pré-render: trecho dinâmico não encontrado ({name}) em {p}'
    swap('timeline', r'<ol class="tl" id="timeline"[^>]*>.*?</ol>', '<ol class="tl" id="timeline"></ol>')
    swap('scn', r'<g id="scn">.*?</svg>', '<g id="scn"></g></svg>')   # cena animada: o JS do visitante desenha
    swap('nextEv', r'<a class="next" id="nextEv" href="#cronograma"[^>]*>.*?</a>', '<a class="next" id="nextEv" href="#cronograma" hidden=""></a>')
    swap('schedWarn', r'<div class="alert" id="schedWarn"[^>]*>.*?</div>', '<div class="alert" id="schedWarn" hidden=""></div>')
    assert 'class="step done"' not in dom, f'pré-render: etapa marcada como concluída em {p}'
    assert not re.search(r'id="assistir"[^>]*\shidden', dom), f'pré-render: #assistir ficou oculto (GSAP não carregou?) em {p}'
    return dom if dom.lstrip().lower().startswith('<!doctype') else '<!doctype html>\n' + dom


def root_page():
    main = RECIPES[0]
    alts = '\n'.join(f'<link rel="alternate" hreflang="{HREFLANG[x]}" href="{url(x, main)}">' for x in LANGS)
    cards = ''.join(f'<a href="/{l}/" hreflang="{HREFLANG[l]}" lang="{I18N[l]["meta"]["htmlLang"]}" data-setlang="{l}"><b>{esc(RTEXT[main["id"]][l]["meta"]["ogTitle"])}</b><span>{I18N[l]["meta"]["label"]}</span></a>' for l in LANGS)
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>NapoliProtocol · Neapolitan Pizza Protocol · Pizza Napolitana · Pizza Napoletana</title>
<meta name="description" content="{esc(ROOT_DESC)}">
<link rel="canonical" href="{DOMAIN}/">
{alts}
<link rel="alternate" hreflang="x-default" href="{DOMAIN}/">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta name="author" content="Jhonathan Sousa">
<meta name="theme-color" content="#120E0C">
<link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="NapoliProtocol">
<meta property="og:locale" content="en_US">
<meta property="og:title" content="NapoliProtocol · Neapolitan Pizza Protocol">
<meta property="og:description" content="{esc(ROOT_DESC)}">
<meta property="og:url" content="{DOMAIN}/">
<meta property="og:image" content="{img("og-root.png")}">
<meta property="og:image:secure_url" content="{img("og-root.png")}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:alt" content="NapoliProtocol, by Jhonathan Sousa">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="NapoliProtocol · Neapolitan Pizza Protocol">
<meta name="twitter:description" content="{esc(ROOT_DESC)}">
<meta name="twitter:image" content="{img("og-root.png")}">
<script>
(function(){{
  var L={json.dumps(LANGS)}, pick=null;
  try{{pick=localStorage.getItem('np-lang')}}catch(e){{}}
  if(L.indexOf(pick)<0){{
    var nav=(navigator.languages&&navigator.languages.length?navigator.languages:[navigator.language||'en']);
    for(var i=0;i<nav.length&&!pick;i++){{var c=String(nav[i]).toLowerCase().slice(0,2); if(L.indexOf(c)>=0) pick=c;}}
  }}
  location.replace('/'+(pick||'en')+'/');
}})();
</script>
<style>
body{{margin:0;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:#120E0C;color:#FFF7EA;display:grid;place-items:center;min-height:100vh;padding:24px;box-sizing:border-box}}
main{{max-width:520px;width:100%}} h1{{font-family:Georgia,"Times New Roman",serif;font-style:italic;font-weight:400;font-size:40px;margin:0 0 24px;letter-spacing:-.01em}} h1 b{{font-weight:400;color:#E9B872}}
.flag{{display:flex;width:18px;height:12px;border-radius:2px;overflow:hidden;margin-bottom:20px}} .flag i{{flex:1}} .flag i:nth-child(1){{background:#2F8A45}} .flag i:nth-child(2){{background:#fff}} .flag i:nth-child(3){{background:#C2321A}}
a{{display:flex;justify-content:space-between;gap:12px;padding:16px 18px;margin-bottom:8px;border:1px solid rgb(255 247 234/.2);border-radius:14px;color:inherit;text-decoration:none;min-height:24px}}
a:hover{{border-color:#E9B872}} a:focus-visible{{outline:3px solid #E9B872;outline-offset:3px}} a span{{color:#D9CBB8}}
</style>
</head>
<body><main><div class="flag" aria-hidden="true"><i></i><i></i><i></i></div><h1>Napoli<b>Protocol</b></h1><nav>{cards}</nav></main></body>
</html>
'''


def not_found():
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>404 · NapoliProtocol</title><meta name="robots" content="noindex"><meta name="theme-color" content="#120E0C"><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>body{{margin:0;font-family:system-ui,sans-serif;background:#120E0C;color:#FFF7EA;display:grid;place-items:center;min-height:100vh;text-align:center;padding:24px;box-sizing:border-box}}
h1{{font-family:Georgia,"Times New Roman",serif;font-style:italic;font-weight:400;font-size:64px;margin:0 0 8px;color:#E9B872}}p{{margin:0 0 20px;color:#D9CBB8;font-size:18px}}
nav a{{display:inline-block;margin:4px;padding:12px 20px;border:1px solid rgb(255 247 234/.2);border-radius:99px;color:#FFF7EA;text-decoration:none;font-weight:600}}nav a:hover{{border-color:#E9B872}}a:focus-visible{{outline:3px solid #E9B872;outline-offset:3px}}</style>
</head><body><main><h1>404</h1><p>Página não encontrada · Page not found</p><nav><a href="/pt/">NapoliProtocol · Português</a><a href="/en/">NapoliProtocol · English</a></nav></main></body></html>
'''


def retired_page(dest):
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>NapoliProtocol</title><meta name="robots" content="noindex,follow"><link rel="canonical" href="{DOMAIN}{dest}">
<meta http-equiv="refresh" content="0; url={dest}"><script>location.replace('{dest}'+location.hash)</script></head>
<body style="font-family:system-ui,sans-serif;background:#120E0C;color:#FFF7EA;display:grid;place-items:center;min-height:100vh"><a href="{dest}" style="color:#E9B872;font-weight:700">NapoliProtocol</a></body></html>
'''


def sitemap():
    rows = []
    for c in RECIPES:
        for l in LANGS:
            alts = ''.join(f'<xhtml:link rel="alternate" hreflang="{HREFLANG[x]}" href="{url(x, c)}"/>' for x in LANGS)
            alts += f'<xhtml:link rel="alternate" hreflang="x-default" href="{xdefault(c)}"/>'
            rows.append(f'  <url><loc>{url(l, c)}</loc><lastmod>{c["updated"]}</lastmod>{alts}</url>')
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
            + '\n'.join(rows) + '\n</urlset>\n')


PIZZAS = {
 'napolitana': '''<svg viewBox="0 0 240 240" style="position:absolute;{pos}">
<circle cx="120" cy="120" r="112" fill="#EAD5AC"/><circle cx="120" cy="120" r="88" fill="#C8341F"/>
<g fill="#FFFDF5"><circle cx="92" cy="96" r="15"/><circle cx="148" cy="92" r="13"/><circle cx="122" cy="138" r="16"/><circle cx="84" cy="150" r="12"/><circle cx="158" cy="150" r="14"/></g>
<g fill="#2F6B3A"><path d="M110 104c8-12 24-12 28 0-12 4-20 4-28 0z"/><path d="M140 124c8-10 20-8 24 2-10 2-18 2-24-2z"/><path d="M76 120c6-10 18-10 22 0-8 3-15 3-22 0z"/></g>
<g fill="#2A2420" opacity=".7"><circle cx="30" cy="96" r="4"/><circle cx="44" cy="58" r="3"/><circle cx="78" cy="22" r="5"/><circle cx="150" cy="16" r="3"/><circle cx="196" cy="44" r="4"/><circle cx="222" cy="102" r="3"/><circle cx="214" cy="160" r="5"/><circle cx="176" cy="210" r="3"/><circle cx="112" cy="226" r="4"/><circle cx="56" cy="204" r="3"/><circle cx="20" cy="150" r="3"/></g>
<circle cx="120" cy="120" r="112" fill="none" stroke="#2A2420" stroke-width="3"/></svg>''',
 # New York: borda fina e dourada, queijo cobrindo quase tudo, fatias marcadas e uma fatia afastada
 'new-york': '''<svg viewBox="0 0 240 240" style="position:absolute;{pos}">
<g transform="translate(120 120)">
<circle r="112" fill="#D9A55E"/><circle r="100" fill="#C8341F"/><circle r="97" fill="#F3D27A"/>
<g fill="#E9B84E" opacity=".9"><circle cx="-40" cy="-30" r="16"/><circle cx="30" cy="-48" r="13"/><circle cx="48" cy="22" r="18"/><circle cx="-22" cy="44" r="15"/><circle cx="-62" cy="18" r="11"/></g>
<g fill="#C8341F" opacity=".75"><circle cx="-8" cy="-12" r="7"/><circle cx="62" cy="-22" r="5"/><circle cx="12" cy="68" r="6"/><circle cx="-70" cy="-48" r="5"/></g>
<g fill="#5C7A3A"><circle cx="-30" cy="-60" r="1.6"/><circle cx="20" cy="-20" r="1.6"/><circle cx="56" cy="50" r="1.6"/><circle cx="-50" cy="60" r="1.6"/><circle cx="70" cy="0" r="1.6"/><circle cx="-12" cy="22" r="1.6"/></g>
<g stroke="#2A2420" stroke-width="2.5" opacity=".55"><line x1="0" y1="-112" x2="0" y2="112"/><line x1="-112" y1="0" x2="112" y2="0"/><line x1="-79" y1="-79" x2="79" y2="79"/><line x1="-79" y1="79" x2="79" y2="-79"/></g>
<circle r="112" fill="none" stroke="#2A2420" stroke-width="3"/></g></svg>''',
}


def card_html(o, w, h, pizza):
    # layout: texto à esquerda/topo, pizza à direita/embaixo, autoria no rodapé
    if w / h > 1.5:   pz, tw, fs = f'right:40px;top:{(h-470)//2+20}px;width:470px;height:470px', 620, 92
    elif w / h > 1.1: pz, tw, fs = 'right:40px;bottom:40px;width:480px;height:480px', 600, 92
    else:             pz, tw, fs = 'right:40px;bottom:40px;width:600px;height:600px', 1000, 104
    return f'''<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Young+Serif&family=Figtree:wght@400;600;700&display=block">
<style>
html,body{{margin:0;width:{w}px;height:{h}px;overflow:hidden}}
body{{background:#F7F2E8;color:#2A2420;font-family:Figtree,"PingFang SC","Hiragino Sans GB",sans-serif;position:relative}}
.stripe{{position:absolute;top:0;left:0;right:0;height:12px;background:linear-gradient(90deg,#2F8A45 0 33.33%,#fff 33.33% 66.66%,#C8341F 66.66%)}}
.txt{{position:absolute;left:80px;top:96px;width:{tw}px}}
.eb{{font-size:20px;letter-spacing:.14em;text-transform:uppercase;color:#6B6158;font-weight:600}}
h1{{font-family:"Young Serif","Songti SC",serif;font-weight:400;font-size:{fs}px;line-height:1.04;margin:22px 0 0}}
p{{font-size:26px;color:#6B6158;margin:22px 0 0;line-height:1.35;max-width:600px}}
.by{{position:absolute;left:80px;bottom:64px;display:flex;align-items:center;gap:18px}}
.mono{{width:64px;height:64px;border-radius:50%;background:#C8341F;color:#FFFDF8;display:flex;align-items:center;justify-content:center;font-family:"Young Serif",serif;font-size:26px}}
.by b{{display:block;font-size:28px}}.by span{{font-size:21px;color:#6B6158}}
.url{{position:absolute;right:48px;top:40px;font-size:20px;color:#6B6158;font-weight:600}}
</style></head><body>
<div class="stripe"></div><div class="url">napoliprotocol.com</div>
<div class="txt"><div class="eb">{esc(o["eyebrow"])}</div><h1>{esc(o["title"]).replace(chr(10), "<br>")}</h1><p>{esc(o["sub"])}</p></div>
{pizza.format(pos=pz)}
<div class="by"><div class="mono">JS</div><div><b>{esc(o["by"])}</b><span>@jhonsousa1</span></div></div>
</body></html>'''


def images(only=None):
    out = OUT / 'img'; out.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        jobs = []
        for c in RECIPES:
            if only and c['id'] not in only: continue
            pz = PIZZAS[c['id']]
            for l in LANGS:
                o = RTEXT[c['id']][l]['meta']['og']; p = prefix(c)
                for name, w, h in [(f'og-{p}{l}.png', 1200, 630), (f'recipe-{p}{l}-16x9.png', 1200, 675),
                                   (f'recipe-{p}{l}-4x3.png', 1200, 900), (f'recipe-{p}{l}-1x1.png', 1200, 1200)]:
                    jobs.append((name, w, h, card_html(o, w, h, pz)))
        if not only:
            jobs.append(('og-root.png', 1200, 630, card_html({'eyebrow': 'Pizza napoletana · PT · EN', 'title': 'Napoli\nProtocol',
                         'sub': 'Recipe, schedule and oven in 13 steps, calibrated bake after bake.', 'by': 'by Jhonathan Sousa'}, 1200, 630, PIZZAS['napolitana'])))
            icon = f'<!doctype html><html><body style="margin:0;width:180px;height:180px;background:#F7F2E8">{PIZZAS["napolitana"].format(pos="left:10px;top:10px;width:160px;height:160px")}</body></html>'
            jobs.append(('apple-touch-icon.png', 180, 180, icon))
            (OUT / 'favicon.svg').write_text(PIZZAS['napolitana'].format(pos='').replace(' style="position:absolute;"', ' xmlns="http://www.w3.org/2000/svg"'), 'utf-8')
        for name, w, h, doc in jobs:
            f = Path(tmp) / (name + '.html'); f.write_text(doc, 'utf-8')
            chrome([f'--window-size={w},{h}', f'--screenshot={out / name}', f.as_uri()])
            assert (out / name).exists(), name
            print('  img', name)


# Termos que só existem na napolitana: se aparecerem em outra receita, algum texto vazou do arquivo errado.
LEAKS = ['Caputo Pizzeria 00', 'pré-fermento', 'preferment', 'prefermento', 'panetti', '1ª fornada', 'first bake',
         '1.ª horneada', '1ª infornata', '第一炉', 'bassinage', '面种']


def leak_check(c, l, html_text):
    if c['id'] == 'napolitana': return
    body = re.sub(r'<script.*?</script>', '', html_text, flags=re.S)   # o JS embute textos comuns (menus etc.)
    bound = lambda w: (r'(?<!\w)' + re.escape(w) + r'(?!\w)') if w.isascii() or not re.search(r'[\u4e00-\u9fff]', w) else re.escape(w)
    found = [w for w in LEAKS if re.search(bound(w), body, re.I)]   # palavra inteira ("panettiere" ≠ "panetti"); chinês sem fronteira
    assert not found, f'{c["id"]}/{l}: textos da napolitana vazaram: {found}'


# ---------- cenário: derivadas das fotos de fundo ----------
SCENE_DIR = SRC / 'photos' / 'scene'            # só o manifest.json fica versionado aqui
SCENE_OUT = OUT / 'img' / 'scene'               # única cópia versionada das derivadas (gerada por --scene)
SRGB = '/System/Library/ColorSync/Profiles/sRGB Profile.icc'
WIDTHS = {'d': (1280, 1920, 2560, 3200), 'm': (800, 1200, 1600)}
JPG_W = {'d': 1280, 'm': 800}                   # um único JPG de fallback por foto/recorte
CAPS = {('d', 1920): 190, ('d', 3200): 320, ('m', 1200): 120, ('m', 1600): 180}   # tetos de AVIF, em KB
CROP_FULL = [0, 0, 100, 100]


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    assert r.returncode == 0, f'{cmd[0]} falhou: {r.stderr[-300:]}'


def scene_images():
    """Gera docs/img/scene/<chave>-<d|m>-<largura>.{avif,jpg} e src/photos/scene/manifest.json (ver README)."""
    SCENE_DIR.mkdir(parents=True, exist_ok=True); SCENE_OUT.mkdir(parents=True, exist_ok=True)
    mpath = SCENE_DIR / 'manifest.json'
    manifest = json.loads(mpath.read_text('utf-8')) if mpath.exists() else {}
    warns = []
    for k, p in PHOTOS.items():
        if 'crop_m' not in p: continue
        orig = SRC / 'photos' / 'originals' / f'{k}-orig.jpg'
        if not orig.exists():
            print(f'  skip {k}: original ausente'); continue
        q = p.get('q', {}); qa, qj = q.get('avif', 48), q.get('jpg', 58)
        ow, oh = p['ow'], p['oh']
        manifest[k] = {}
        with tempfile.TemporaryDirectory() as tmp:
            tmp = Path(tmp)
            run(['sips', '-m', SRGB, '-s', 'format', 'png', str(orig), '--out', str(tmp / 'srgb.png')])   # três originais são Display P3
            jobs = []
            for v in ('d', 'm'):
                crop = p.get('crop_d', CROP_FULL) if v == 'd' else p['crop_m']
                x, y, w, h = round(crop[0] / 100 * ow), round(crop[1] / 100 * oh), round(crop[2] / 100 * ow), round(crop[3] / 100 * oh)
                manifest[k][v] = {'crop': crop, 'A': round(w / h, 4), 'files': []}
                for W in WIDTHS[v]:
                    if W > w: continue          # não amplia
                    jobs.append((v, W, (x, y, w, h)))
            def work(job):
                v, W, (x, y, w, h) = job; base = tmp / f'{v}-{W}'; out = SCENE_OUT / f'{k}-{v}-{W}'
                run(['cwebp', '-quiet', '-lossless', '-z', '0', '-exact', '-crop', str(x), str(y), str(w), str(h), '-resize', str(W), '0',
                     str(tmp / 'srgb.png'), '-o', str(base) + '.webp'])
                run(['dwebp', '-quiet', str(base) + '.webp', '-o', str(base) + '.png'])
                H = round(W * h / w); files = []
                run(['avifenc', '-q', str(qa), '-s', '4', '-y', '420', '-j', '4', str(base) + '.png', str(out) + '.avif']); files.append((W, H, 'avif'))
                if W == JPG_W[v]:
                    run(['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', str(qj), str(base) + '.png', '--out', str(out) + '.jpg']); files.append((W, H, 'jpg'))
                return v, files
            with ThreadPoolExecutor(3) as ex:
                for v, files in ex.map(work, jobs):
                    for W, H, fmt in files:
                        b = (SCENE_OUT / f'{k}-{v}-{W}.{fmt}').stat().st_size
                        manifest[k][v]['files'].append({'w': W, 'h': H, 'fmt': fmt, 'bytes': b})
        for v in ('d', 'm'):
            manifest[k][v]['files'].sort(key=lambda f: (f['fmt'], f['w']))
    mpath.write_text(json.dumps(manifest, indent=1) + '\n', 'utf-8')
    print(f'  {"foto":9}{"var":4}{"w":6}' + ''.join(f'{f:>9}' for f in ('avif', 'jpg')))
    total = 0
    for k, vs in manifest.items():
        for v, e in vs.items():
            for W in sorted({f['w'] for f in e['files']}):
                row = {f['fmt']: f['bytes'] for f in e['files'] if f['w'] == W}; total += sum(row.values())
                print(f'  {k:9}{v:4}{W:<6}' + ''.join(f'{row[f] // 1024:>8}K' if f in row else f'{"":>9}' for f in ('avif', 'jpg')))
                cap = CAPS.get((v, W))
                if cap and row['avif'] > cap * 1024: warns.append(f'{k} {v}-{W}: AVIF {row["avif"] // 1024} KB > {cap} KB (baixe "q":{{"avif":...}} em photos.json)')
    print(f'  total: {total / 1048576:.1f} MB')
    for w in warns: print('  AVISO', w)


def load_manifest():
    mpath = SCENE_DIR / 'manifest.json'
    return json.loads(mpath.read_text('utf-8')) if mpath.exists() else {}



def main():
    OUT.mkdir(exist_ok=True)
    if '--images' in sys.argv: images()
    if '--scene' in sys.argv: scene_images()
    (OUT / 'img' / 'photos').mkdir(parents=True, exist_ok=True)
    for f in (SRC / 'photos').glob('*.jpg'): shutil.copy2(f, OUT / 'img' / 'photos' / f.name)
    for c in RECIPES:
        for l in LANGS:
            d = OUT / l / c['slug'] if c['slug'] else OUT / l
            d.mkdir(parents=True, exist_ok=True)
            f = d / 'index.html'
            f.write_text(page(l, c), 'utf-8')
            final = prerender(f)
            leak_check(c, l, final)
            f.write_text(final, 'utf-8')
            print('  page', f.relative_to(ROOT))
    for old, new in RETIRED.items():   # /es/, /it/, /zh/ (e /new-york/) → equivalente em inglês
        for c in RECIPES:
            d = OUT / old / c['slug'] if c['slug'] else OUT / old
            d.mkdir(parents=True, exist_ok=True)
            (d / 'index.html').write_text(retired_page(path(new, c)), 'utf-8')
    (OUT / 'index.html').write_text(root_page(), 'utf-8')
    (OUT / '404.html').write_text(not_found(), 'utf-8')
    (OUT / 'sitemap.xml').write_text(sitemap(), 'utf-8')
    (OUT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\n\nSitemap: {DOMAIN}/sitemap.xml\n', 'utf-8')
    (OUT / 'CNAME').write_text('napoliprotocol.com\n', 'utf-8')
    (OUT / '.nojekyll').write_text('', 'utf-8')
    print('ok')


if __name__ == '__main__':
    main()
