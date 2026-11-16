#!/usr/bin/env python3
"""Prévia rápida de uma composição: python3 design/jornada/tools/art.py <cena> <estado> <luz> [claro|escuro] [receita] -> qa/impl/art/<cena>-<estado>-<luz>-<tema>.png
Renderiza a arte inteira (1600x900) com parede e bancada aproximadas; as etiquetas HTML não entram (use cdp.mjs shots para a câmera real)."""
import re, subprocess, sys
from pathlib import Path
R = Path(__file__).resolve().parents[3]; sys.path.insert(0, str(R))
import build
SHEET = sys.argv[1] == 'sheet'
if SHEET:
    sname, specs = sys.argv[2], sys.argv[3:]
else:
    specs = [':'.join(sys.argv[1:4]) + ':' + (sys.argv[5] if len(sys.argv) > 5 else 'napolitana')]
theme = 'claro'
if not SHEET and len(sys.argv) > 4: theme = sys.argv[4]
if SHEET and specs[-1] in ('claro', 'escuro'): theme = specs.pop()
css = (R / 'src/style.css').read_text('utf-8')
vars_ = re.search(r':root\{(.*?)\n\}', css, re.S).group(1)
dark = re.search(r'html\[data-theme=dark\]\{(.*?)\n\}', css, re.S).group(1)
defs = (R / 'src/scenes/defs.svg').read_text('utf-8')
th = 'dark' if theme == 'escuro' else 'light'
def stage(spec, safe=True):
    comp, state, light, *r = spec.split(':'); rid = r[0] if r else 'napolitana'
    c = next(x for x in build.RECIPES if x['id'] == rid)
    L = build.scene_layers(comp, state, build.scene_tokens(c, state), c)
    body = ''.join(f'<svg class="art {k}" viewBox="0 0 1600 900" width="1600" height="900">{L[k]}</svg>' for k in build.LAYERS if L[k])
    return f'<div class="stage l-{light}" style="--wl:var(--w-{light});--bl:var(--b-{light})">{body}{"<div class=safe></div>" if safe else ""}</div>'
stages = ''.join(stage(sp, not SHEET) for sp in specs)
html = f'''<!doctype html><html data-theme="{th}"><head><meta charset="utf-8"><style>
:root{{{vars_}}} html[data-theme=dark]{{{dark}}}
{re.search(r"(\.l-dusk.*?\.l-cold\{[^}]*\})", css, re.S).group(1)}
body{{margin:0;background:#111}} .sheet{{display:grid;grid-template-columns:1600px 1600px;width:3200px}}
.stage{{position:relative;width:1600px;height:900px;overflow:hidden;background:linear-gradient(180deg,rgb(255 255 255/.10),transparent 38%),linear-gradient(90deg,var(--wl),var(--wr))}}
.stage::before{{content:"";position:absolute;left:0;right:0;top:340px;height:260px;background:linear-gradient(180deg,rgb(30 14 4/0),rgb(30 14 4/.05) 45%,rgb(30 14 4/.2))}}
.stage::after{{content:"";position:absolute;left:0;right:0;top:600px;bottom:0;border-top:2px solid rgb(255 240 215/.28);background:
 linear-gradient(180deg,transparent 178px,rgb(255 236 205/.4) 178px 181px,color-mix(in srgb,var(--br) 58%,#000) 181px),
 linear-gradient(180deg,rgb(255 235 205/.16),transparent 9%,transparent 40%,rgb(20 8 0/.34)),
 repeating-linear-gradient(180deg,transparent 0 17px,rgb(40 18 4/.07) 17px 18px,transparent 18px 41px,rgb(255 230 190/.06) 41px 43px,transparent 43px 71px,rgb(40 18 4/.09) 71px 73px),linear-gradient(90deg,var(--bl),var(--br))}}
.art{{position:absolute;left:0;top:0;z-index:1}} .art.sub,.art.near{{filter:brightness(var(--dim)) saturate(calc(.55 + var(--dim)*.45))}} .art.fx{{z-index:2}} .art.near{{z-index:3}}
.safe{{position:absolute;left:650px;top:190px;width:560px;height:440px;border:1px dashed rgb(255 0 255/.5);z-index:9}}
.bub,.wisp,.pour,.drop,.pulse,.breathe{{animation:none}}
</style></head><body><svg width="0" height="0" style="position:absolute">{re.sub(r"<!--.*?-->","",defs,flags=re.S)}</svg>
<div class="{'sheet' if SHEET else ''}">{stages}</div></body></html>'''
out = R / 'design/jornada/qa/impl/art'; out.mkdir(parents=True, exist_ok=True)
name = sname if SHEET else '-'.join(specs[0].split(':')[:3]) + f'-{theme}'
f = out / f'{name}.html'; f.write_text(html, 'utf-8')
subprocess.run([build.CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', f'--window-size={3200 if SHEET else 1600},{900 * ((len(specs) + 1) // 2) if SHEET else 900}', f'--screenshot={out / (name + ".png")}', f.as_uri()], capture_output=True, timeout=60)
print(out / f'{name}.png')
