# NapoliProtocol

Protocolos de pizza em português e inglês, com passo a passo animado — https://napoliprotocol.com

- Napolitana (receita principal): `/<idioma>/`
- New York (v0.1, em teste): `/<idioma>/new-york/`

Por [Jhonathan Sousa](https://www.instagram.com/jhonsousa1/). © 2026, todos os direitos reservados.

## Como editar

- Textos comuns do site: `src/i18n/<idioma>.json`
- Cada receita: `src/recipes/<id>/recipe.json` (padrões, cronograma, timer, avisos) e `src/recipes/<id>/<idioma>.json` (textos)
- Layout e lógica: `src/template.html`, `src/style.css`, `src/illustrations.js`
- Gerar o site: `python3 build.py` (use `--images` para regenerar as imagens). Requer Google Chrome.
- O GitHub Pages publica a pasta `docs/`.

## Nova receita

1. Copie `src/recipes/new-york/` para `src/recipes/<id>/` e ajuste `id`, `slug`, `order`, `version` e `ls`.
2. Escreva os textos em pt e en (mesmas chaves).
3. Adicione a ilustração em `PIZZAS` no `build.py` e rode `python3 build.py --images`.
O build falha se faltar alguma chave ou se termos exclusivos da napolitana aparecerem em outra receita.

## Cenário (fotos)

O fundo do site é uma foto fixa (`.scene`) que a "câmera" reenquadra em cada janela da página. A câmera é CSS puro, gerado pelo `build.py` a partir do bloco `scene` de cada receita; `src/scene.js` (~2 KB) só troca `data-take` no `.scene` com `IntersectionObserver`.

- **Originais**: `src/photos/originals/<chave>-orig.jpg`, em alta resolução e **fora do git** (`.gitignore`). Sem eles o `--scene` pula a foto (`skip <chave>: original ausente`) e o build normal segue com as derivadas já commitadas.
- **Derivadas**: `python3 build.py --scene` converte para sRGB, recorta e gera, em **`docs/img/scene/`** (a única cópia versionada), `<chave>-<d|m>-<largura>.avif` em todos os tamanhos (d: 1280/1920/2560/3200; m: 800/1200/1600) e um único JPG de fallback por foto/recorte (`d-1280`, `m-800`, qualidade 58). Não há WebP. `src/photos/scene/` guarda só o `manifest.json` (versionado), que o build lê para montar `<picture>`, preload e câmera. Total em torno de 4,4 MB. Imprime a tabela de pesos e avisa se algum AVIF passar do teto (ajuste `"q": {"avif": 44, "jpg": 55}` na foto em `photos.json`).
- **Fotos**: em `src/photos/photos.json`, cada foto de cenário precisa de `author`, `license`, `source`, `ow`/`oh` (tamanho do original), `crop_m` (`[x0, y0, w, h]` em %, recorte mobile) e, opcionalmente, `crop_d`.
- **Declarar o cenário** em `src/recipes/<id>/recipe.json`: `"scene": {"scrim": 1.0, "takes": {"hero": {"photo": "oro", "d": {"f": [45,48], "a": [64,52], "s": 1.0, "bleed": "l"}, "m": {...}}, "tempo": ..., "gesto": ..., "fogo": ..., "fim": ...}}`. `f` é o foco em % do original, `a` a âncora em % do viewport, `s` a escala sobre "cover" (máx. 1,30 no desktop), `bleed` (`l` ou `t`) deixa a borda dissolver no carvão. O build falha se faltar tomada, se a foto não tiver crédito, se o foco sair do recorte ou se a foto do herói for igual à de outra receita.
- **Textos das janelas** em `src/recipes/<id>/<idioma>.json` (`scene.tempo|gesto|fogo` com `h` e `p`, `scene.fim.h`; `*palavra*` vira itálico dourado) e nomes dos capítulos em `src/i18n/<idioma>.json` (`chap.1`…`chap.6`).
- Endereços antigos `/es/`, `/it/`, `/zh/` redirecionam para `/en/` (idiomas removidos em nov/2026).
