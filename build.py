#!/usr/bin/env python3
"""Gera o site estático multilíngue e multi-receita em docs/ (publicado pelo GitHub Pages).

    python3 build.py            # páginas + sitemap + robots + raiz
    python3 build.py --images   # também regenera as imagens (og, receita, ícones)

Fontes:
  src/template.html, src/style.css, src/illustrations.js   layout e lógica
  src/i18n/<lang>.json                                     textos comuns do site
  src/recipes/<id>/recipe.json                             configuração da receita (padrões, cronograma, timer…)
  src/recipes/<id>/<lang>.json                             textos da receita

Cada página é pré-renderizada no Chrome headless para que passos, quantidades e o
JSON-LD da receita já estejam no HTML que o Google lê.
URLs: /<lang>/ para a receita principal (slug vazio) e /<lang>/<slug>/ para as demais.
"""
import html, json, re, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).parent
SRC, OUT = ROOT / 'src', ROOT / 'docs'
DOMAIN = 'https://napoliprotocol.com'
LANGS = ['pt', 'en', 'es', 'it', 'zh']            # ordem do menu
HREFLANG = {'pt': 'pt', 'en': 'en', 'es': 'es', 'it': 'it', 'zh': 'zh-Hans'}
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
ROOT_DESC = ('Neapolitan pizza recipe and step-by-step protocol: dough calculator, 3-day schedule and oven guide. '
             'Pizza napolitana · pizza napoletana · 那不勒斯披萨. By Jhonathan Sousa.')

I18N = {l: json.loads((SRC / 'i18n' / f'{l}.json').read_text('utf-8')) for l in LANGS}
RECIPES = sorted((json.loads(p.read_text('utf-8')) for p in (SRC / 'recipes').glob('*/recipe.json')), key=lambda c: c['order'])
RTEXT = {c['id']: {l: json.loads((SRC / 'recipes' / c['id'] / f'{l}.json').read_text('utf-8')) for l in LANGS} for c in RECIPES}

esc = lambda s: html.escape(s, quote=True)
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
<meta name="theme-color" content="#C8341F">
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
    js['cfg'] = {k: c[k] for k in ('def', 'ls', 'features', 'warn', 'sched', 'timer', 'ld')}
    js['ld'] = dict(js['ld'], url=url(l, c), inLanguage=HREFLANG[l],
                    images=[img(f'recipe-{prefix(c)}{l}-{r}.png') for r in ('1x1', '4x3', '16x9')])
    assert len(js['sched']['ev']) == len(c['sched']), f'{c["id"]}/{l}: cronograma'
    globe = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" fill="none" stroke="currentColor" stroke-width="2"/></svg>'
    menu = (f'<details class="lang"><summary aria-label="{esc(d["html"]["nav.lang"])}">{globe}{d["meta"]["short"]}</summary>'
            f'<ul>{"".join(lang_links(l, c, "menu"))}</ul></details>')
    f = c['features']; hide = lambda on: '' if on else ' hidden'
    zones, scale, clock0 = timer_markup(c['timer'])
    rep = {
        'HTML_LANG': d['meta']['htmlLang'], 'LANG': l, 'HEAD': head(l, c, d), 'LANG_MENU': menu,
        'FOOT_LANGS': ''.join(lang_links(l, c, 'foot')),
        'RECIPE_TABS': recipe_links(l, c, 'tabs'), 'FOOT_RECIPES': recipe_links(l, c, 'foot'),
        'NSTEPS': str(sum(len(day['items']) for day in js['steps'])),
        'REF_W': esc(c['ref']['w']), 'REF_SALT': esc(c['ref']['salt']), 'TARGET': esc(c['targetSize']),
        'HIDE_SUGAR': hide(f['sugar']), 'HIDE_PF': hide(f['preferment']), 'HIDE_WSPLIT': hide(f['waterSplit']),
        'TABLE_CLASS': '' if f['preferment'] else 'no-pf', 'SPLIT_CLASS': '' if f['waterSplit'] else ' two',
        'TIMER_ZONES': zones, 'TIMER_SCALE': scale, 'CLOCK0': clock0,
        'CSS': (SRC / 'style.css').read_text('utf-8'), 'IL': (SRC / 'illustrations.js').read_text('utf-8'),
        'RULES': ''.join(f'<li>{esc(r)}</li>' for r in d['rules']),
        'GLOSSARY': ''.join(f'<div class="card"><dt>{esc(a)}</dt><dd>{esc(b)}</dd></div>' for a, b in d['glossary']),
        'T_JSON': json.dumps(js, ensure_ascii=False).replace('</', '<\\/'),
        'ABOUT_SITE': ''.join(f'<p>{esc(x)}</p>' for x in d['about']['site']),
        'ABOUT_PIZZA': ''.join(f'<p>{esc(x)}</p>' for x in d['about']['pizza']),
        'ABOUT_FACTS': ''.join(f'<div class="fact"><b>{esc(v)}</b><span>{esc(t)}</span></div>' for v, t in d['about']['facts']),
    }
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
    r = chrome(['--dump-dom', p.as_uri()])
    dom = r.stdout
    assert 'id="ld-recipe"' in dom and 'class="step"' in dom, f'pré-render falhou: {p}\n{r.stderr[-500:]}'
    # estado que depende do relógio do build: deixa o JS do visitante preencher
    dom = re.sub(r'(<html[^>]*?) data-theme="\w+"', r'\1', dom, count=1)
    dom = re.sub(r'<ol class="tl" id="timeline">.*?</ol>', '<ol class="tl" id="timeline"></ol>', dom, flags=re.S)
    dom = re.sub(r'<a class="next" id="nextEv" href="#cronograma">.*?</a>', '<a class="next" id="nextEv" href="#cronograma" hidden=""></a>', dom, flags=re.S)
    dom = re.sub(r'<div class="alert" id="schedWarn">.*?</div>', '<div class="alert" id="schedWarn" hidden=""></div>', dom, flags=re.S)
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
<meta name="theme-color" content="#C8341F">
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
body{{margin:0;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:#F7F2E8;color:#2A2420;display:grid;place-items:center;min-height:100vh;padding:24px;box-sizing:border-box}}
main{{max-width:520px;width:100%}} h1{{font-family:Georgia,serif;font-weight:400;font-size:32px;margin:0 0 20px}}
.stripe{{height:4px;background:linear-gradient(90deg,#2F8A45 0 33.3%,#fff 33.3% 66.6%,#C8341F 66.6%);margin-bottom:24px;border-radius:2px}}
a{{display:flex;justify-content:space-between;gap:12px;padding:14px 16px;margin-bottom:8px;border:1px solid #E6DCCB;border-radius:10px;background:#FFFDF8;color:inherit;text-decoration:none}}
a:hover{{border-color:#C8341F}} a span{{color:#6B6158}}
</style>
</head>
<body><main><div class="stripe"></div><h1>NapoliProtocol</h1><nav>{cards}</nav></main></body>
</html>
'''


def not_found():
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>404 · NapoliProtocol</title><meta name="robots" content="noindex"><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>body{{margin:0;font-family:system-ui,sans-serif;background:#F7F2E8;color:#2A2420;display:grid;place-items:center;min-height:100vh;text-align:center}}a{{color:#C8341F;font-weight:600}}</style>
</head><body><main><h1 style="font-family:Georgia,serif;font-weight:400">404</h1><p><a href="/">NapoliProtocol</a></p></main></body></html>
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
            jobs.append(('og-root.png', 1200, 630, card_html({'eyebrow': 'Pizza napoletana · PT · EN · ES · IT · 中文', 'title': 'Napoli\nProtocol',
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
         '1.ª horneada', '1ª infornata', '第一炉', 'Bassinage']


def leak_check(c, l, html_text):
    if c['id'] == 'napolitana': return
    body = re.sub(r'<script.*?</script>', '', html_text, flags=re.S)   # o JS embute textos comuns (menus etc.)
    found = [w for w in LEAKS if w.lower() in body.lower()]
    assert not found, f'{c["id"]}/{l}: textos da napolitana vazaram: {found}'


def main():
    OUT.mkdir(exist_ok=True)
    if '--images' in sys.argv: images()
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
    (OUT / 'index.html').write_text(root_page(), 'utf-8')
    (OUT / '404.html').write_text(not_found(), 'utf-8')
    (OUT / 'sitemap.xml').write_text(sitemap(), 'utf-8')
    (OUT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\n\nSitemap: {DOMAIN}/sitemap.xml\n', 'utf-8')
    (OUT / 'CNAME').write_text('napoliprotocol.com\n', 'utf-8')
    (OUT / '.nojekyll').write_text('', 'utf-8')
    print('ok')


if __name__ == '__main__':
    main()
