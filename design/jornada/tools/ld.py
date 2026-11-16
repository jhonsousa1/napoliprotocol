#!/usr/bin/env python3
"""JSON-LD: `ld.py save` grava a linha de base; `ld.py cmp` compara o docs/ atual com ela (igualdade profunda do objeto inteiro)."""
import json, re, sys
from pathlib import Path
R = Path(__file__).resolve().parents[3]; B = R / 'design/jornada/baseline'
PAGES = {'napolitana-pt': 'pt/index.html', 'napolitana-en': 'en/index.html', 'new-york-pt': 'pt/new-york/index.html', 'new-york-en': 'en/new-york/index.html'}
def get(rel):
    h = (R / 'docs' / rel).read_text('utf-8')
    m = re.search(r'<script type="application/ld\+json" id="ld-recipe">(.*?)</script>', h, re.S)
    assert m, f'sem ld-recipe em {rel}'
    return json.loads(m.group(1))
if sys.argv[1] == 'save':
    for k, rel in PAGES.items(): (B / f'ld-{k}.json').write_text(json.dumps(get(rel), ensure_ascii=False, indent=1) + '\n', 'utf-8'); print('saved', k)
else:
    bad = 0
    for k, rel in PAGES.items():
        a, b = json.loads((B / f'ld-{k}.json').read_text('utf-8')), get(rel)
        ok = a == b; bad += not ok
        print(('OK  ' if ok else 'DIFF'), k, len(b['recipeInstructions']), 'passos', len(b['recipeIngredient']), 'ingredientes')
        if not ok:
            for key in a:
                if a[key] != b.get(key): print('   campo', key, '\n   ', json.dumps(a[key], ensure_ascii=False)[:300], '\n   ', json.dumps(b.get(key), ensure_ascii=False)[:300])
    sys.exit(1 if bad else 0)
