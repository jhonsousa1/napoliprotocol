# NapoliProtocol

Protocolos de pizza em 5 idiomas (pt, en, es, it, zh) — https://napoliprotocol.com

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
2. Escreva os textos nos 5 idiomas (mesmas chaves).
3. Adicione a ilustração em `PIZZAS` no `build.py` e rode `python3 build.py --images`.
O build falha se faltar alguma chave ou se termos exclusivos da napolitana aparecerem em outra receita.
