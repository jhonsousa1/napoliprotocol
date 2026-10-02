# NapoliProtocol

Protocolo da pizza napolitana em 5 idiomas (pt, en, es, it, zh) — https://napoliprotocol.com

Por [Jhonathan Sousa](https://www.instagram.com/jhonsousa1/). © 2026, todos os direitos reservados.

## Como editar

- Textos: `src/i18n/<idioma>.json`
- Layout e lógica: `src/template.html`, `src/style.css`, `src/illustrations.js`
- Gerar o site: `python3 build.py` (use `--images` para regenerar as imagens). Requer Google Chrome.
- O GitHub Pages publica a pasta `docs/`.
