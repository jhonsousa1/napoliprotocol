#!/usr/bin/env python3
"""Gera o site estático multilíngue e multi-receita em docs/ (publicado pelo GitHub Pages).

    python3 build.py            # páginas + sitemap + robots + raiz
    python3 build.py --images   # também regenera as imagens (og, receita, ícones)
    python3 build.py --sizes    # também imprime o peso do SVG de cada ladrilho

Fontes:
  src/template.html, src/style.css, src/app.js, src/journey.js   layout e lógica
  src/scenes/defs.svg, src/scenes/<composição>.svg          ilustração da jornada (ver README)
  src/i18n/<lang>.json                                     textos comuns do site
  src/recipes/<id>/recipe.json                             configuração da receita (padrões, cronograma, timer…)
  src/recipes/<id>/<lang>.json                             textos da receita

Cada página é pré-renderizada no Chrome headless para que passos, quantidades e o
JSON-LD da receita já estejam no HTML que o Google lê.
URLs: /<lang>/ para a receita principal (slug vazio) e /<lang>/<slug>/ para as demais.
"""
import html, json, re, shutil, subprocess, sys, tempfile
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
        out.append(f'<a href="{path(l, c)}" data-recipe="{c["id"]}" data-ls="{c["ls"]}"{cur_attr}>{name}{badge if cls == "tabs" else ""}</a>')
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
<meta name="twitter:image" content="{og}">'''



emph = lambda s: re.sub(r'\*(.+?)\*', r'<em>\1</em>', esc(s))


def timer_markup(t):
    pct = lambda s: f'{s / t["max"] * 100:.2f}%'
    zone = lambda cls, a, b: f'<div class="z {cls}" style="left:{pct(a)};width:{pct(b - a)}"></div>'
    mm = t['max'] >= 300
    lab = lambda s: f'{s // 60}' if mm else f'{s}'
    ticks = [f'<span>{lab(s)}</span>' for s in t['ticks']]
    ticks[-1] = f'<span>{lab(t["ticks"][-1])} {"min" if mm else "s"}</span>'
    clock0 = '0:00<small> min</small>' if mm else '0<small> s</small>'
    return zone('turn', *t['turn']) + zone('ok', *t['ok']), ''.join(ticks), clock0


# ---------- jornada: ladrilhos, cenas e etiquetas ----------
SCENES = SRC / 'scenes'
MOMENTS = ('dusk', 'eve', 'night', 'morning', 'noon', 'golden', 'ember', 'cold')
LAYERS = ('far', 'sub', 'fx', 'near')
CALC_KEYS = {'flour', 'water', 'salt', 'oil', 'yeast', 'sugar', 'total', 'pfFlour', 'pfWater', 'pfTotal', 'finFlour', 'finWater',
             'saltWater', 'initWater', 'bassWater', 'n', 'per', 'alt', 'sauceTotal', 'cheeseTotal', 'cans', 'canSalt', 'top', 'bottom',
             'fridge', 'pfh', 'panh', 'outh', 'sauce', 'cheese', 'hydPct', 'saltPct', 'oilPct', 'yeastPct', 'sugarPct', 'w'}
TILE_KB, TILE_EL, PAGE_KB = 14, 260, 240        # orçamento de SVG: por ladrilho (já filtrado), elementos e página inteira
STRICT_UNUSED = True                             # E8: chave de texto sem uso vira erro
USED = {'html': {l: set() for l in LANGS}, 'tag': set()}
STATS = []                                       # (receita, idioma, ladrilho, bytes, elementos), para --sizes
IF_RE = re.compile(r'<!--if:(!?[\w\-+ !]+?)-->(.*?)<!--/if-->', re.S)


def kspan(text, c):
    """Escapa o texto e troca {k} por <span class="v" data-k="k"> (o JS preenche); {size} vira o literal da receita."""
    s = esc(text).replace('{size}', esc(c['targetSize']))
    def r(m):
        assert m.group(1) in CALC_KEYS, f'chave de cálculo desconhecida: {{{m.group(1)}}} em "{text}"'
        return f'<span class="v" data-k="{m.group(1)}"></span>'
    return re.sub(r'\{(\w+)\}', r, s)


def scene_tokens(c, state):
    """Tokens ativos de um ladrilho: o estado, o id da receita, as flags (pf, sugar, wsplit) e as combinações estado+flag."""
    f = c['features']
    flags = {k for k, v in (('pf', f['preferment']), ('sugar', f['sugar']), ('wsplit', f['waterSplit'])) if v}
    return {state, c['id']} | flags | {f'{state}+{x}' for x in flags | {c['id']}}


def scene_file(comp):
    f = SCENES / f'{comp}.svg'
    assert f.exists(), f'cena ausente: {f}'
    return f.read_text('utf-8')


def validate_fragment(comp, raw):
    assert ' id="' not in raw and " id='" not in raw, f'{comp}.svg: fragmentos não podem ter id='
    for m in LAYERS: assert f'<!--@{m}-->' in raw, f'{comp}.svg: falta a marca <!--@{m}-->'
    depth = 0
    for m in re.finditer(r'<!--(/?)if(?::[^>]*)?-->', raw):
        depth += -1 if m.group(1) else 1
        assert 0 <= depth <= 1, f'{comp}.svg: blocos <!--if--> aninhados ou sem abertura'
    assert depth == 0, f'{comp}.svg: bloco <!--if--> sem fechamento'


def ring_svg(c):
    t = c['timer']; mx = t['max']; per = 60 if mx >= 300 else 30
    base = f'<path d="M731 289A260 260 0 0 1 1129 289" pathLength="{mx}" fill="none" '
    zone = lambda rng, col: base + f'stroke="{col}" stroke-width="18" stroke-dasharray="{rng[1] - rng[0]} {mx}" stroke-dashoffset="-{rng[0]}"/>'
    return (base + 'stroke="#1a0b06" stroke-opacity=".5" stroke-width="18" stroke-linecap="round"/>' + zone(t['turn'], '#F2B544') + zone(t['ok'], '#7CC489')
            + base + f'stroke="#1a0b06" stroke-opacity=".55" stroke-width="22" stroke-dasharray="1.4 {per - 1.4}" stroke-dashoffset=".7"/>'
            + base + f'class="ring-fill" stroke="#FFF6E4" stroke-width="7" stroke-linecap="round" stroke-dasharray="0 {mx}"/>')


def default_n(c):
    """Número de panetti do padrão da receita (mesma conta do calc() do app.js), para desenhar a bandeja já no HTML estático."""
    P = c['def']; rnd = lambda x: int(x + .5)
    ratio = 1 + (P['hyd'] + P['salt'] + P['oil'] + P['yeast'] + P['sugar']) / 100
    flour = P['pizzas'] * P['w'] / ratio if P['mode'] == 'pizza' else P['flour']
    total = flour + flour * P['hyd'] / 100 + rnd(flour * P['salt'] / 100) + rnd(flour * P['oil'] / 100) + flour * P['yeast'] / 100 + flour * P['sugar'] / 100
    return max(1, rnd(total / P['w']))


def balls_svg(n, big=1.0):
    """Mesmo desenho de drawBalls() em journey.js; o JS redesenha conforme o cálculo."""
    f = lambda v: f'{v:.1f}'.rstrip('0').rstrip('.')
    show = min(n, 12); rows = 2 if show > 6 else 1; per_row = -(-show // rows)
    sp = min(96 * big, 400 / per_row); r = min(44 * big, sp * .47); out = []
    for i in range(show):
        row = 0 if rows == 2 and i < show - per_row else 1
        idx = i if row == 0 else i - (show - per_row if rows == 2 else 0); cnt = show - per_row if row == 0 else per_row
        s = .86 if rows == 2 and row == 0 else 1
        cx = 930 + (idx - (cnt - 1) / 2) * sp; cy = (582 if row == 0 and rows == 2 else 600) - r * s * .72
        out.append(f'<g class="ball" style="--i:{i}"><ellipse cx="{f(cx)}" cy="{f(cy + r * s * .7)}" rx="{f(r * s)}" ry="{f(r * s * .22)}" fill="url(#gCon)"/>'
                   f'<ellipse cx="{f(cx)}" cy="{f(cy)}" rx="{f(r * s)}" ry="{f(r * s * .76)}" fill="url(#gDough)"/>'
                   f'<path d="M{f(cx + r * s * .2)} {f(cy - r * s * .5)}q{f(r * s * .38)} {f(r * s * .08)} {f(r * s * .48)} {f(r * s * .4)}" stroke="#fff" stroke-opacity=".7" stroke-width="{f(r * .1)}" stroke-linecap="round" fill="none"/></g>')
    return ''.join(out)


def pots_svg(n):
    n = min(n, 8); cols = 4 if n > 4 else n; rows = -(-n // cols); sp = min(130, 520 / cols); out = []
    for i in range(n):
        rw = i // cols; cn = n - rw * cols if rw == rows - 1 else cols; ix = i - rw * cols
        cx = 930 + (ix - (cn - 1) / 2) * sp; y = 520 if rw == 0 and rows > 1 else 592; s = .84 if rw == 0 and rows > 1 else 1
        out.append(f'<g class="ball" style="--i:{i}"><use href="#pot" transform="translate({cx:g} {y}) scale({s})"/></g>')
    return ''.join(out)


def scene_layers(comp, state, tokens, c):
    """Fragmento da composição já filtrado: dict {far, sub, fx, near} só com os blocos ativos."""
    raw = scene_file(comp); validate_fragment(comp, raw)
    if state is not None and '<!--if:' in raw:
        assert any(state in re.split(r'\s+', m.group(1).lstrip('!')) for m in IF_RE.finditer(raw)), f'{comp}.svg: estado "{state}" não aparece em nenhum <!--if:-->'
    def pick(m):
        ok = any((t[1:] not in tokens) if t.startswith('!') else (t in tokens) for t in m.group(1).split())
        return m.group(2) if ok else ''
    txt = IF_RE.sub(pick, raw)
    parts = re.split(r'<!--@(far|sub|fx|near)-->', txt)
    layers = {k: '' for k in LAYERS}
    for k, v in zip(parts[1::2], parts[2::2]): layers[k] += v
    for k, v in layers.items():
        v = re.sub(r'<!--.*?-->', '', v, flags=re.S)
        v = v.replace('<g data-draw="ring"></g>', f'<g data-draw="ring">{ring_svg(c)}</g>')
        v = re.sub(r'(<g[^>]*data-draw="balls">)</g>', lambda m: m.group(1) + balls_svg(default_n(c)) + '</g>', v)
        v = re.sub(r'(<g[^>]*data-draw="pots">)</g>', lambda m: m.group(1) + pots_svg(default_n(c)) + '</g>', v)
        layers[k] = re.sub(r'>\s+<', '><', re.sub(r'\s*\n\s*', ' ', v)).strip()
    assert layers['sub'].count('filter="url(#paint)"') <= 1, f'{comp}/{state}: mais de um #paint no assunto'
    return layers


def tags_html(tags, d, c, rt=False):
    out, vis_m = [], 0
    for t in tags:
        assert t['t'] in d['tag'], f'{c["id"]}/{d["meta"]["htmlLang"]}: etiqueta "{t["t"]}" ausente do dicionário tag'
        USED['tag'].add(t['t'])
        x, y = t['at']; style = f'--xd:{x};--yd:{y}'; attrs = ''
        if 'm' in t and t['m'] is None: attrs = ' data-m="0"'
        else:
            vis_m += 1
            if t.get('m'): style += f';--xm:{t["m"][0]};--ym:{t["m"][1]}'
        out.append(f'<span class="tag" style="{style}"{attrs}>{kspan(d["tag"][t["t"]], c)}</span>')
    assert vis_m <= 3, f'{c["id"]}: mais de 3 etiquetas visíveis no mobile'
    if rt: out.append('<span class="tag rt" style="--xd:860;--yd:226"><b class="tt">0:00</b></span>')
    return f'<div class="tags" aria-hidden="true">{"".join(out)}</div>' if out else ''


def figure_html(tid, cfg, prev_light, d, c, l, timer=False):
    assert cfg['light'] in MOMENTS, f'{tid}: luz "{cfg["light"]}" desconhecida'
    layers = scene_layers(cfg['scene'], cfg['state'], scene_tokens(c, cfg['state']), c)
    body = ''.join(f'<svg class="art {k}" viewBox="0 0 1600 900" focusable="false">{layers[k]}</svg>' for k in LAYERS if layers[k])
    svg_bytes = sum(len(layers[k].encode()) for k in LAYERS)
    els = sum(len(re.findall(r'<[a-zA-Z]', layers[k])) for k in LAYERS)
    STATS.append((c['id'], l, tid, svg_bytes, els))
    assert svg_bytes <= TILE_KB * 1024 and els <= TILE_EL, f'{c["id"]}/{l}/{tid}: orçamento de SVG estourado ({svg_bytes / 1024:.1f} KB, {els} elementos; máx. {TILE_KB} KB e {TILE_EL})'
    tags = tags_html(cfg.get('tags', []), d, c, rt=timer)
    return (f'<figure class="scene l-{cfg["light"]}" aria-hidden="true" data-scene="{cfg["scene"]}/{cfg["state"]}" '
            f'style="--wl:var(--w-{prev_light});--bl:var(--b-{prev_light})">{body}{tags}</figure>')


def validate_journey(c, l, d):
    j, steps = c['journey'], [s for day in d['js']['steps'] for s in day['items']]
    ids = [s['id'] for s in steps]
    assert set(ids) == set(j['steps']), f'{c["id"]}/{l}: etapas de js.steps e journey.steps diferem: {set(ids) ^ set(j["steps"])}'
    n_ev = len(c['sched'])
    cfgs = [('abertura', j['open']), ('mise', j['mise'])] + [(i, j['steps'][i]) for i in ids] + [(k['id'], k) for k in j['cold']]
    for tid, cfg in cfgs:
        assert cfg['light'] in MOMENTS, f'{tid}: luz inválida'
        assert (SCENES / f'{cfg["scene"]}.svg').exists(), f'{tid}: cena {cfg["scene"]} não existe'
        if 'ev' in cfg: assert cfg['ev'] in range(n_ev), f'{tid}: ev {cfg["ev"]} fora do cronograma'
        for t in cfg.get('tags', []):
            assert t['t'] in d['tag'], f'{c["id"]}/{l}/{tid}: etiqueta {t["t"]} ausente'
            if t.get('m', 0) is not None:   # visível no mobile: dentro da caixa segura (regra 3 de 1.2)
                for pos in (t['at'], t.get('m') or t['at']):
                    assert 190 <= pos[1] <= 630 and 640 <= pos[0] <= 1210, f'{c["id"]}/{tid}: âncora {t["t"]} {pos} fora da caixa segura (x 640-1210, y 190-630)'
    for k in j['cold']:
        assert k['after'] in ids and f'cold.{k["id"]}.h' in d['html'] and f'cold.{k["id"]}.p' in d['html'], f'{c["id"]}/{l}: interlúdio {k["id"]} incompleto'
        assert k['big'] in CALC_KEYS
    assert sum(1 for s in j['steps'].values() if s.get('timer')) == 1, f'{c["id"]}: exatamente uma etapa com timer'


def build_journey(c, l, d, h):
    """Gera os ladrilhos (abertura, prólogo, etapas, interlúdios), trilho, doca e índice. h(k) lê html.* e registra o uso."""
    j, days = c['journey'], d['js']['steps']
    steps = [(day, s) for day in days for s in day['items']]
    cold_after = {k['after']: k for k in j['cold']}
    seq = []                                    # ordem de leitura de todos os ladrilhos
    seq.append(dict(id='abertura', kind='open', title=h('ask.go'), cfg=j['open']))
    seq.append(dict(id='mise', kind='mise', title=h('mise.h'), cfg=j['mise']))
    n = 0
    for day, s in steps:
        n += 1
        seq.append(dict(id=s['id'], kind='step', n=n, title=s['t'], day=f'{day["day"]} · {day["when"]}', dayhead=day, s=s, cfg=j['steps'][s['id']]))
        if s['id'] in cold_after:
            k = cold_after[s['id']]
            seq.append(dict(id=k['id'], kind='cold', title=h(f'cold.{k["id"]}.h'), day=f'{day["day"]} · {day["when"]}', cfg=k))
    NS = n
    prev_light = j['open']['light']
    for e in seq:
        e['fig'] = figure_html(e['id'], e['cfg'], prev_light, d, c, l, timer=bool(e['cfg'].get('timer')))
        prev_light = e['cfg']['light']
    # ordem de leitura para os links "Próxima"
    nxt = {e['id']: (seq[i + 1]['id'] if i + 1 < len(seq) else None) for i, e in enumerate(seq)}
    zones, scale, clock0 = timer_markup(c['timer'])
    html_steps = []
    seen_day = None
    li = []
    for i, e in enumerate(seq):
        if e['kind'] == 'step':
            s, day = e['s'], e['dayhead']
            if li: html_steps.append('<li>' + ''.join(li) + '</li>'); li = []
            if seen_day != day['day']:
                li.append(f'<h2 class="day-h sr">{esc(day["day"])} · {esc(day["when"])}</h2>'); seen_day = day['day']
            nid = nxt[e['id']]
            nxt_link = (f'<a class="next" href="#{nid}">{esc(h("step.next"))} ↓</a>' if nid else
                        f'<a class="next" href="#epilogo">{esc(h("step.how"))} ↓</a>')
            chips = f'<span class="chip t">{kspan(s["time"], c)}</span>' + ''.join(f'<span class="chip">{esc(d["js"]["src"][x])}</span>' for x in s['src'])
            tip = ''
            if s.get('tip'):
                w = s['tip'].startswith('warn|'); tip = f'<p class="tip{" warn" if w else ""}">{kspan(s["tip"][5:] if w else s["tip"], c)}</p>'
            timer = ''
            if e['cfg'].get('timer'):
                timer = (f'<div class="timer"><p class="eyebrow">{esc(h("oven.timer"))}</p><div class="clock" id="clock" role="timer">{clock0}</div>'
                         f'<div><div class="track" aria-hidden="true">{zones}<div class="head" id="head"></div></div><div class="scale" aria-hidden="true">{scale}</div></div>'
                         f'<p class="status" id="tStatus" aria-live="polite"></p><div class="timer-btns"><button class="btn primary" type="button" id="tStart"></button>'
                         f'<button class="btn" type="button" id="tReset">{esc(h("oven.reset"))}</button></div><p class="fine">{esc(h("oven.note"))}</p></div>')
            cls = 'tile step' + (' last' if i == len(seq) - 1 else '')
            li.append(
                f'<article class="{cls}" id="{e["id"]}" aria-labelledby="h-{e["id"]}" data-ev="{e["cfg"]["ev"]}" data-n="{e["n"]:02d}" data-title="{esc(e["title"])}" data-day="{esc(e["day"])}">'
                f'{e["fig"]}<div class="card"><p class="eyebrow">{esc(day["day"])} · {esc(h("step.label"))} {e["n"]:02d} <span class="when" data-when="{e["cfg"]["ev"]}"></span><span class="now" hidden>{esc(d["js"]["now"])}</span></p>'
                f'<h3 id="h-{e["id"]}">{esc(s["t"])}</h3><div class="chips">{chips}</div>{timer}'
                f'<ul class="ins">{"".join(f"<li>{kspan(x, c)}</li>" for x in s["li"])}</ul>{tip}'
                f'<div class="foot"><label class="done"><input type="checkbox" data-step="{e["id"]}"><span>{esc(h("step.done"))}</span></label>{nxt_link}</div></div></article>')
        elif e['kind'] == 'cold':
            k = e['cfg']; nid = nxt[e['id']]
            li.append(
                f'<aside class="tile cold" id="{k["id"]}" aria-labelledby="h-{k["id"]}" data-ev="{k["ev"]}" data-title="{esc(e["title"])}" data-day="{esc(e["day"])}">'
                f'{e["fig"]}<div class="card"><p class="eyebrow">{esc(h("cold.eb"))} <span class="when" data-when="{k["ev"]}"></span><span class="now" hidden>{esc(d["js"]["now"])}</span></p>'
                f'<h3 id="h-{k["id"]}">{esc(e["title"])}</h3><p class="big">≈ <span class="v" data-k="{k["big"]}"></span> {esc(h("cold.unit"))} <small>· <span class="v" data-k="fridge"></span> °C</small></p>'
                f'<p>{esc(h(f"cold.{k["id"]}.p"))}</p><p class="left" data-left="{k["ev"]}"></p>'
                f'<div class="foot"><a class="next" href="#adj-agenda">{esc(h("cold.bake"))} ↗</a><a class="next" href="#{nid}">{esc(h("cold.next"))} ↓</a></div></div></aside>')
    if li: html_steps.append('<li>' + ''.join(li) + '</li>')
    rail = ''.join(f'<a href="#{e["id"]}" data-for="{e["id"]}" aria-label="{e["n"]:02d} · {esc(e["title"])}"><span aria-hidden="true">{e["n"]:02d} · {esc(e["title"])}</span></a>' for e in seq if e['kind'] == 'step')
    idx = ''.join(f'<li><a href="#{e["id"]}" data-for="{e["id"]}">'
                  + (f'<b>{e["n"]:02d}</b>' if e['kind'] == 'step' else '<b>·</b>') + f'<span>{esc(e["title"])}</span></a></li>' for e in seq if e['kind'] != 'open')
    meta = [dict(id=e['id'], kind=e['kind'], n=e.get('n', 0), title=e['title'], ev=e['cfg'].get('ev', -1), day=e.get('day', '')) for e in seq]
    return dict(first=next(e['id'] for e in seq if e['kind'] == 'step'), open=seq[0]['fig'], mise=seq[1]['fig'], journey=''.join(html_steps), rail=rail, idx=idx, meta=meta, N=NS)


def gallery_html(c, l):
    ph = c.get('photos', {}).get('gallery', [])
    return ''.join(figure(k, l, 'ref') for k in ph)


def page(l, c):
    d = merge(I18N[l], RTEXT[c['id']][l])
    tpl = (SRC / 'template.html').read_text('utf-8')
    for k in re.findall(r'\{\{([\w.]+)\}\}', tpl): USED['html'][l].add(k)      # chaves do template contam como usadas, mesmo em blocos {{#pf}} que esta receita não usa
    def h(k):
        assert k in d['html'], f'{c["id"]}/{l}: chave html.{k} ausente'
        USED['html'][l].add(k); return d['html'][k]
    validate_journey(c, l, d)
    jr = build_journey(c, l, d, h)
    js = {k: v for k, v in d['js'].items() if k not in ('steps', 'src')}
    js['cfg'] = {k: c[k] for k in ('id', 'targetSize', 'def', 'ls', 'features', 'warn', 'sched', 'timer', 'ld')}
    js['cfg']['journey'] = jr['meta']
    js['cfg']['recipes'] = [dict(id=o['id'], path=path(l, o), ls=o['ls'], name=RTEXT[o['id']][l]['html']['name'], w=o['def']['w']) for o in RECIPES]
    js['sched'] = d['js']['sched']
    js['ld'] = dict(js['ld'], url=url(l, c), inLanguage=HREFLANG[l], images=[img(f'recipe-{prefix(c)}{l}-{r}.png') for r in ('1x1', '4x3', '16x9')])
    assert len(js['sched']['ev']) == len(c['sched']), f'{c["id"]}/{l}: cronograma'
    globe = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" fill="none" stroke="currentColor" stroke-width="2"/></svg>'
    menu = (f'<details class="lang"><summary aria-label="{esc(d["html"]["nav.lang"])}">{globe}{d["meta"]["short"]}</summary>'
            f'<ul>{"".join(lang_links(l, c, "menu"))}</ul></details>')
    f = c['features']; name = d['html']['name']
    h1 = emph(h('ask.h1'))
    assert re.search(re.escape(esc(name)), h1, re.I), f'{c["id"]}/{l}: nome "{name}" não aparece no h1'
    about = c.get('photos', {}).get('about', [])
    zones, scale, clock0 = timer_markup(c['timer'])
    recs = ''.join(
        f'<a class="rec" href="{path(l, o)}" data-recipe="{o["id"]}" data-ls="{o["ls"]}"{" aria-current=\"page\"" if o["id"] == c["id"] else ""}>'
        f'<b>{esc(RTEXT[o["id"]][l]["html"]["name"])}</b><span>{esc(RTEXT[o["id"]][l]["html"]["ask.sub"])}</span></a>' for o in RECIPES)
    rep = {
        'HTML_LANG': d['meta']['htmlLang'], 'LANG': l, 'HEAD': head(l, c, d), 'LANG_MENU': menu,
        'FOOT_LANGS': ''.join(lang_links(l, c, 'foot')),
        'FOOT_RECIPES': recipe_links(l, c, 'foot'), 'RECIPE_CARDS': recs,
        'NSTEPS': str(jr['N']), 'VERSION': esc(c['version']),
        'REF_W': esc(c['ref']['w']), 'REF_SALT': esc(c['ref']['salt']), 'TARGET': esc(c['targetSize']),
        'SPLIT_CLASS': '' if f['waterSplit'] else ' two',
        'CSS': re.sub(r'\n\s*', '\n', re.sub(r'/\*.*?\*/', '', (SRC / 'style.css').read_text('utf-8'), flags=re.S)).strip(),
        'DEFS': re.sub(r'>\s+<', '><', re.sub(r'<!--.*?-->', '', (SCENES / 'defs.svg').read_text('utf-8'), flags=re.S)).strip(),
        'APP_JS': (SRC / 'app.js').read_text('utf-8').replace('</', '<\\/'), 'JOURNEY_JS': (SRC / 'journey.js').read_text('utf-8').replace('</', '<\\/'),
        'OPEN_FIGURE': jr['open'], 'MISE_FIGURE': jr['mise'], 'JOURNEY': jr['journey'], 'RAIL': jr['rail'], 'IDX': jr['idx'],
        'ASK_H1': h1, 'DLBL': f'{esc(d["js"]["start0"])}<small>{esc(d["js"]["start"])}</small>', 'FIRST': jr['first'], 'EPI_H': emph(h('epi.h')), 'GALLERY': gallery_html(c, l),
        'RULES': ''.join(f'<li>{esc(r)}</li>' for r in d['rules']),
        'GLOSSARY': ''.join(f'<div class="card"><dt>{esc(a)}</dt><dd>{esc(b)}</dd></div>' for a, b in d['glossary']),
        'T_JSON': json.dumps(js, ensure_ascii=False).replace('</', '<\\/'),
        'ABOUT_SITE': ''.join(f'<p>{esc(x)}</p>' for x in d['about']['site']),
        'ABOUT_PIZZA': ''.join(f'<p>{esc(x)}</p>' for x in d['about']['pizza']),
        'ABOUT_MAIN': figure(about[0], l, 'aph', eager=False) if about else '',
        'ABOUT_PHOTOS': ''.join(figure(k, l, 'aph') for k in about[1:]),
        'ABOUT_FACTS': ''.join(f'<div class="fact"><b>{esc(v)}</b><span>{esc(t)}</span></div>' for v, t in d['about']['facts']),
        'TIMER_ZONES': zones, 'TIMER_SCALE': scale, 'CLOCK0': clock0,
    }
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
    USED['html'][l].update(('ask.fine', 'ask.sub', 'name', 'photo', 'nav.lang'))
    ask_fine = d['html']['ask.fine'].replace('{v}', c['version'])
    out = out.replace('@@ASKFINE@@', esc(ask_fine)).replace('@@QTY@@', str(c['def']['pizzas'] if c['def']['mode'] == 'pizza' else c['def']['flour']))
    ids = re.findall(r' id="([^"]+)"', out)
    dup = sorted({i for i in ids if ids.count(i) > 1})
    assert not dup, f'{c["id"]}/{l}: ids duplicados {dup}'
    jbody = re.search(r'<ol class="journey">.*?</ol>', out, re.S).group(0)
    assert '<img' not in jbody, f'{c["id"]}/{l}: <img> dentro de .journey'
    page_svg = sum(len(m.encode()) for m in re.findall(r'<svg class="art.*?</svg>', out, re.S)) + len(rep['DEFS'].encode())
    assert page_svg <= PAGE_KB * 1024, f'{c["id"]}/{l}: {page_svg / 1024:.0f} KB de SVG inline (máx. {PAGE_KB} KB)'
    return out


def prerender(p):
    r = chrome(['--dump-dom', p.as_uri() + '?prerender=1'])
    dom = r.stdout
    assert 'id="ld-recipe"' in dom and 'class="tile step' in dom, f'pré-render falhou: {p}\n{r.stderr[-500:]}'
    # estado que depende do relógio do build: deixa o JS do visitante preencher
    dom = re.sub(r'(<html[^>]*?) data-theme="\w+"', r'\1', dom, count=1)
    dom = re.sub(r'(<html[^>]*?) class="[^"]*"', r'\1', dom, count=1)
    def swap(name, pat, rep, flags=re.S, n=1):
        nonlocal dom
        dom, k = re.subn(pat, rep, dom, count=0 if n == 0 else n, flags=flags)
        assert k >= 1 and (n == 0 or k == n), f'pré-render: trecho dinâmico não encontrado ({name}) em {p}'
    swap('timeline', r'<ol class="tl" id="timeline"[^>]*>.*?</ol>', '<ol class="tl" id="timeline"></ol>')
    swap('nextEv', r'<a class="next" id="nextEv" href="#adj-agenda"[^>]*>.*?</a>', '<a class="next" id="nextEv" href="#adj-agenda" hidden=""></a>')
    swap('schedWarn', r'<div class="alert" id="schedWarn"[^>]*>.*?</div>', '<div class="alert" id="schedWarn" hidden=""></div>')
    swap('when', r'(<span class="when" data-when="\d+">)[^<]*(</span>)', r'\1\2', n=0)
    swap('left', r'(<p class="left" data-left="\d+">)[^<]*(</p>)', r'\1\2', n=0, flags=0)
    swap('mini', r'<span class="mini" id="mini"[^>]*>.*?</span>', '<span class="mini" id="mini" hidden=""></span>')
    assert 'class="tile step done' not in dom, f'pré-render: etapa marcada como concluída em {p}'
    assert not re.search(r'<html[^>]*class=', dom), f'pré-render: <html> com class em {p}'
    assert not re.search(r'class="[^"]*\blive\b', dom), f'pré-render: ladrilho .live em {p}'
    assert not re.search(r'<figure class="scene[^>]*style="[^"]*transform', dom), f'pré-render: transform em .scene em {p}'
    assert not re.search(r'data-when="\d+">[^<]', dom), f'pré-render: data-when preenchido em {p}'
    assert not re.search(r'class="now"(?![^>]*hidden)', dom), f'pré-render: selo "agora" visível em {p}'
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


def keyset(d, pre=''):
    out = set()
    for k, v in d.items():
        out |= keyset(v, f'{pre}{k}.') if isinstance(v, dict) else {f'{pre}{k}'}
    return out


def check_parity():
    """pt e en precisam ter as mesmas chaves (recursivo), em i18n e em cada receita."""
    a, b_ = LANGS[0], LANGS[1]; bad = []
    pairs = [('i18n', I18N[a], I18N[b_])] + [(c['id'], RTEXT[c['id']][a], RTEXT[c['id']][b_]) for c in RECIPES]
    for name, x, y in pairs:
        kx, ky = keyset(x), keyset(y)
        if kx != ky: bad.append(f'{name}: só em {a}: {sorted(kx - ky)}; só em {b_}: {sorted(ky - kx)}')
    for c in RECIPES:   # listas (passos, glossário, regras, diagnóstico): mesmo comprimento
        for k in ('rules', 'glossary'):
            if len(RTEXT[c['id']][a][k]) != len(RTEXT[c['id']][b_][k]): bad.append(f'{c["id"]}: {k} com tamanhos diferentes')
        sa = [(s['id'], bool(s.get('tip')), len(s['li'])) for day in RTEXT[c['id']][a]['js']['steps'] for s in day['items']]
        sb = [(s['id'], bool(s.get('tip')), len(s['li'])) for day in RTEXT[c['id']][b_]['js']['steps'] for s in day['items']]
        if sa != sb: bad.append(f'{c["id"]}: etapas pt/en divergem (id, dica, itens)')
        if len(RTEXT[c['id']][a]['js']['diag']) != len(RTEXT[c['id']][b_]['js']['diag']): bad.append(f'{c["id"]}: diag com tamanhos diferentes')
    assert not bad, 'paridade pt/en:\n  ' + '\n  '.join(bad)


def report_unused():
    """Toda chave de html.* e de tag.* precisa ser usada (template ou build). Até a E8 só avisa."""
    problems = []
    for l in LANGS:
        have = set(I18N[l]['html'])
        for c in RECIPES: have |= set(RTEXT[c['id']][l]['html'])
        un = sorted(k for k in have if k not in USED['html'][l] and not k.startswith('about.'))
        if un: problems.append(f'{l}: html sem uso: {un}')
        tags = set(I18N[l].get('tag', {}))
        for c in RECIPES: tags |= set(RTEXT[c['id']][l].get('tag', {}))
        un = sorted(tags - USED['tag'])
        if un: problems.append(f'{l}: tag sem uso: {un}')
    if problems:
        msg = 'chaves de texto sem uso:\n  ' + '\n  '.join(problems)
        assert not STRICT_UNUSED, msg
        print('  AVISO', msg[:1500])


def main():
    OUT.mkdir(exist_ok=True)
    if '--images' in sys.argv: images()
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
    check_parity()
    report_unused()
    if '--sizes' in sys.argv:
        print(f'  {"receita":11}{"l":3}{"ladrilho":10}{"KB":>7}{"elem":>6}')
        for rid, lg, tid, b, e in STATS: print(f'  {rid:11}{lg:3}{tid:10}{b / 1024:7.1f}{e:6}')
    (OUT / 'index.html').write_text(root_page(), 'utf-8')
    (OUT / '404.html').write_text(not_found(), 'utf-8')
    (OUT / 'sitemap.xml').write_text(sitemap(), 'utf-8')
    (OUT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\n\nSitemap: {DOMAIN}/sitemap.xml\n', 'utf-8')
    (OUT / 'CNAME').write_text('napoliprotocol.com\n', 'utf-8')
    (OUT / '.nojekyll').write_text('', 'utf-8')
    print('ok')


if __name__ == '__main__':
    main()
