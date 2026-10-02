#!/usr/bin/env python3
"""Gera o site estático multilíngue em docs/ (publicado pelo GitHub Pages).

    python3 build.py            # páginas + sitemap + robots + raiz
    python3 build.py --images   # também regenera as imagens (og, receita, ícones)

Fonte: src/template.html + src/style.css + src/illustrations.js + src/i18n/<lang>.json.
Cada página é pré-renderizada no Chrome headless para que passos, quantidades e o
JSON-LD da receita já estejam no HTML que o Google lê.
"""
import html, json, re, shutil, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).parent
SRC, OUT = ROOT / 'src', ROOT / 'docs'
DOMAIN = 'https://napoliprotocol.com'
LANGS = ['pt', 'en', 'es', 'it', 'zh']            # ordem do menu
HREFLANG = {'pt': 'pt', 'en': 'en', 'es': 'es', 'it': 'it', 'zh': 'zh-Hans'}
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
UPDATED = '2026-10-01'

I18N = {l: json.loads((SRC / 'i18n' / f'{l}.json').read_text('utf-8')) for l in LANGS}
esc = lambda s: html.escape(s, quote=True)
url = lambda l: f'{DOMAIN}/{l}/'
img = lambda name: f'{DOMAIN}/img/{name}'


def chrome(args):
    # headless novo + virtual time, sem perfil temporário (com --user-data-dir ele não encerra)
    return subprocess.run([CHROME, '--headless=new', '--virtual-time-budget=4000', '--disable-gpu',
                           '--hide-scrollbars', '--no-first-run', *args],
                          capture_output=True, text=True, timeout=90)


def lang_links(cur, cls):
    items = []
    for l in LANGS:
        m = I18N[l]['meta']
        cur_attr = ' aria-current="page"' if l == cur else ''
        a = f'<a href="../{l}/" hreflang="{HREFLANG[l]}" lang="{m["htmlLang"]}" data-setlang="{l}"{cur_attr}>'
        items.append(f'<li>{a}{m["label"]}<span>{m["short"]}</span></a></li>' if cls == 'menu' else f'{a}{m["label"]}</a>')
    return items


def head(l):
    m = I18N[l]['meta']
    alts = '\n'.join(f'<link rel="alternate" hreflang="{HREFLANG[x]}" href="{url(x)}">' for x in LANGS)
    og_alt = '\n'.join(f'<meta property="og:locale:alternate" content="{I18N[x]["meta"]["ogLocale"]}">' for x in LANGS if x != l)
    return f'''<title>{esc(m["title"])}</title>
<meta name="description" content="{esc(m["description"])}">
<meta name="author" content="Jhonathan Sousa">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="theme-color" content="#C8341F">
<link rel="canonical" href="{url(l)}">
{alts}
<link rel="alternate" hreflang="x-default" href="{DOMAIN}/">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/img/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="NapoliProtocol">
<meta property="og:locale" content="{m["ogLocale"]}">
{og_alt}
<meta property="og:title" content="{esc(m["ogTitle"])}">
<meta property="og:description" content="{esc(m["description"])}">
<meta property="og:url" content="{url(l)}">
<meta property="og:image" content="{img(f"og-{l}.png")}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{esc(m["imgAlt"])}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(m["ogTitle"])}">
<meta name="twitter:description" content="{esc(m["description"])}">
<meta name="twitter:image" content="{img(f"og-{l}.png")}">'''


def page(l):
    d = I18N[l]
    tpl = (SRC / 'template.html').read_text('utf-8')
    js = dict(d['js'])
    js['ld'] = dict(js['ld'], url=url(l), inLanguage=HREFLANG[l],
                    images=[img(f'recipe-{l}-1x1.png'), img(f'recipe-{l}-4x3.png'), img(f'recipe-{l}-16x9.png')])
    globe = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" fill="none" stroke="currentColor" stroke-width="2"/></svg>'
    menu = (f'<details class="lang"><summary aria-label="{esc(d["html"]["nav.lang"])}">{globe}{d["meta"]["short"]}</summary>'
            f'<ul>{"".join(lang_links(l, "menu"))}</ul></details>')
    rep = {
        'HTML_LANG': d['meta']['htmlLang'], 'HEAD': head(l), 'LANG_MENU': menu,
        'FOOT_LANGS': ''.join(lang_links(l, 'foot')),
        'CSS': (SRC / 'style.css').read_text('utf-8'), 'IL': (SRC / 'illustrations.js').read_text('utf-8'),
        'RULES': ''.join(f'<li>{esc(r)}</li>' for r in d['rules']),
        'GLOSSARY': ''.join(f'<div class="card"><dt>{esc(a)}</dt><dd>{esc(b)}</dd></div>' for a, b in d['glossary']),
        'T_JSON': json.dumps(js, ensure_ascii=False).replace('</', '<\\/'),
    }
    missing = []
    def sub(m):
        k = m.group(1)
        if k in rep: return rep[k]
        if k in d['html']: return esc(d['html'][k])
        missing.append(k); return m.group(0)
    out = re.sub(r'\{\{([\w.]+)\}\}', sub, tpl)
    assert not missing, f'{l}: chaves ausentes {missing}'
    return out


def prerender(path):
    r = chrome(['--dump-dom', path.as_uri()])
    dom = r.stdout
    assert 'id="ld-recipe"' in dom and 'class="step"' in dom, f'pré-render falhou: {path}\n{r.stderr[-500:]}'
    # estado que depende do relógio do build: deixa o JS do visitante preencher
    dom = re.sub(r'<ol class="tl" id="timeline">.*?</ol>', '<ol class="tl" id="timeline"></ol>', dom, flags=re.S)
    dom = re.sub(r'<a class="next" id="nextEv" href="#cronograma">.*?</a>', '<a class="next" id="nextEv" href="#cronograma" hidden=""></a>', dom, flags=re.S)
    dom = re.sub(r'<div class="alert" id="schedWarn">.*?</div>', '<div class="alert" id="schedWarn" hidden=""></div>', dom, flags=re.S)
    return dom if dom.lstrip().lower().startswith('<!doctype') else '<!doctype html>\n' + dom


def root_page():
    alts = '\n'.join(f'<link rel="alternate" hreflang="{HREFLANG[x]}" href="{url(x)}">' for x in LANGS)
    cards = ''.join(f'<a href="/{l}/" hreflang="{HREFLANG[l]}" lang="{I18N[l]["meta"]["htmlLang"]}" data-setlang="{l}"><b>{esc(I18N[l]["meta"]["ogTitle"])}</b><span>{I18N[l]["meta"]["label"]}</span></a>' for l in LANGS)
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>NapoliProtocol · Neapolitan Pizza Protocol · Pizza Napolitana · Pizza Napoletana</title>
<meta name="description" content="Neapolitan pizza recipe and step-by-step protocol in Portuguese, English, Spanish, Italian and Chinese. By Jhonathan Sousa.">
<link rel="canonical" href="{DOMAIN}/">
{alts}
<link rel="alternate" hreflang="x-default" href="{DOMAIN}/">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="website"><meta property="og:site_name" content="NapoliProtocol">
<meta property="og:title" content="NapoliProtocol · Neapolitan Pizza Protocol"><meta property="og:url" content="{DOMAIN}/">
<meta property="og:image" content="{img("og-en.png")}"><meta name="twitter:card" content="summary_large_image">
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
    for l in LANGS:
        alts = ''.join(f'<xhtml:link rel="alternate" hreflang="{HREFLANG[x]}" href="{url(x)}"/>' for x in LANGS)
        alts += f'<xhtml:link rel="alternate" hreflang="x-default" href="{DOMAIN}/"/>'
        rows.append(f'  <url><loc>{url(l)}</loc><lastmod>{UPDATED}</lastmod>{alts}</url>')
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
            + '\n'.join(rows) + '\n</urlset>\n')


PIZZA = '''<svg viewBox="0 0 240 240" style="position:absolute;{pos}">
<circle cx="120" cy="120" r="112" fill="#EAD5AC"/><circle cx="120" cy="120" r="88" fill="#C8341F"/>
<g fill="#FFFDF5"><circle cx="92" cy="96" r="15"/><circle cx="148" cy="92" r="13"/><circle cx="122" cy="138" r="16"/><circle cx="84" cy="150" r="12"/><circle cx="158" cy="150" r="14"/></g>
<g fill="#2F6B3A"><path d="M110 104c8-12 24-12 28 0-12 4-20 4-28 0z"/><path d="M140 124c8-10 20-8 24 2-10 2-18 2-24-2z"/><path d="M76 120c6-10 18-10 22 0-8 3-15 3-22 0z"/></g>
<g fill="#2A2420" opacity=".7"><circle cx="30" cy="96" r="4"/><circle cx="44" cy="58" r="3"/><circle cx="78" cy="22" r="5"/><circle cx="150" cy="16" r="3"/><circle cx="196" cy="44" r="4"/><circle cx="222" cy="102" r="3"/><circle cx="214" cy="160" r="5"/><circle cx="176" cy="210" r="3"/><circle cx="112" cy="226" r="4"/><circle cx="56" cy="204" r="3"/><circle cx="20" cy="150" r="3"/></g>
<circle cx="120" cy="120" r="112" fill="none" stroke="#2A2420" stroke-width="3"/></svg>'''


def card_html(o, w, h):
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
<div class="txt"><div class="eb">{esc(o["eyebrow"])}</div><h1>{esc(o["title"])}</h1><p>{esc(o["sub"])}</p></div>
{PIZZA.format(pos=pz)}
<div class="by"><div class="mono">JS</div><div><b>{esc(o["by"])}</b><span>@jhonsousa1</span></div></div>
</body></html>'''


def images():
    out = OUT / 'img'; out.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        jobs = []
        for l in LANGS:
            o = I18N[l]['meta']['og']
            for name, w, h in [(f'og-{l}.png', 1200, 630), (f'recipe-{l}-16x9.png', 1200, 675),
                               (f'recipe-{l}-4x3.png', 1200, 900), (f'recipe-{l}-1x1.png', 1200, 1200)]:
                jobs.append((name, w, h, card_html(o, w, h)))
        icon = f'<!doctype html><html><body style="margin:0;width:180px;height:180px;background:#F7F2E8">{PIZZA.format(pos="left:10px;top:10px;width:160px;height:160px")}</body></html>'
        jobs.append(('apple-touch-icon.png', 180, 180, icon))
        for name, w, h, doc in jobs:
            f = Path(tmp) / (name + '.html'); f.write_text(doc, 'utf-8')
            chrome([f'--window-size={w},{h}', f'--screenshot={out / name}', f.as_uri()])
            assert (out / name).exists(), name
            print('  img', name)
    (OUT / 'favicon.svg').write_text(PIZZA.format(pos='').replace(' style="position:absolute;"', ' xmlns="http://www.w3.org/2000/svg"'), 'utf-8')


def main():
    OUT.mkdir(exist_ok=True)
    if '--images' in sys.argv: images()
    for l in LANGS:
        d = OUT / l; d.mkdir(exist_ok=True)
        f = d / 'index.html'
        f.write_text(page(l), 'utf-8')
        f.write_text(prerender(f), 'utf-8')
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
