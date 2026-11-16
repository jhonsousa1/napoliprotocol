# NapoliProtocol

Protocolos de pizza em português e inglês, com passo a passo animado — https://napoliprotocol.com

- Napolitana (receita principal): `/<idioma>/`
- New York (v0.1, em teste): `/<idioma>/new-york/`

Por [Jhonathan Sousa](https://www.instagram.com/jhonsousa1/). © 2026, todos os direitos reservados.

## Como editar

- Textos comuns do site: `src/i18n/<idioma>.json`
- Cada receita: `src/recipes/<id>/recipe.json` (padrões, cronograma, timer, avisos) e `src/recipes/<id>/<idioma>.json` (textos)
- Layout e lógica: `src/template.html`, `src/style.css`, `src/app.js` (estado, cálculo, ferramentas), `src/journey.js` (câmera, navegação)
- Gerar o site: `python3 build.py` (use `--images` para regenerar as imagens). Requer Google Chrome.
- O GitHub Pages publica a pasta `docs/`.

## Nova receita

1. Copie `src/recipes/new-york/` para `src/recipes/<id>/` e ajuste `id`, `slug`, `order`, `version` e `ls`.
2. Escreva os textos em pt e en (mesmas chaves).
3. Monte `journey` em `recipe.json` reaproveitando as composições (ou pinte uma nova em `src/scenes/`), com `cold.<id>.h/.p` e `tag.*` próprios.
4. Adicione a ilustração em `PIZZAS` no `build.py` e rode `python3 build.py --images`.
O build falha se faltar alguma chave ou se termos exclusivos da napolitana aparecerem em outra receita.

## Jornada e cenas (ilustração)

O site é um percurso ("Piano Sequenza"): abertura, prólogo, uma cena por etapa, interlúdios da geladeira e epílogo. Cada ladrilho (`.tile`) tem uma figura SVG fixa que a rolagem desloca na horizontal (CSS `view-timeline`; fallback em `src/journey.js`). Sem movimento, sem JS ou no pré-render, a figura fica parada em cima do cartão.

- **Mapa etapa → cena**: `src/recipes/<id>/recipe.json › journey` (`open`, `mise`, `steps.<id>` com `scene`, `state`, `light`, `ev`, `tags`, `timer`; `cold` para os interlúdios). `light` é um momento do dia (`dusk eve night morning noon golden ember cold`); a parede e a bancada vêm de CSS e a emenda entre ladrilhos é garantida pelo build.
- **Composições**: `src/scenes/<composição>.svg` (`bench jar fridge bowl slab tray sauce oven slice`, mais `pending.svg`). São fragmentos sem `<svg>` raiz, divididos em camadas por `<!--@far-->`, `<!--@sub-->`, `<!--@fx-->` e `<!--@near-->`, com blocos condicionais **não aninhados** `<!--if:estado outro-->…<!--/if-->` (tokens: o estado, o id da receita, `pf`/`sugar`/`wsplit`, e combinações `estado+pf`, `estado+<receita>`). Quadro 1600×900, bancada em y = 600, caixa segura do assunto x 650–1210, y 190–630. Sem `id=`, sem texto com palavras, no máximo um `#paint` por estado. Materiais, filtros e adereços reutilizados ficam em `src/scenes/defs.svg`.
- **Etiquetas de quantidade** são HTML em coordenadas da arte (`journey.<…>.tags`, texto em `tag.*` dos arquivos de i18n e da receita); o número vem de `{chave}` do cálculo.
- **Orçamento**: até 14 KB e 260 elementos por ladrilho e 240 KB de SVG por página; `python3 build.py --sizes` imprime a tabela. Passar disso é erro do build.
- **Prévia rápida da arte**: `python3 design/jornada/tools/art.py <cena> <estado> <luz> [claro|escuro] [receita]` (ou `sheet <nome> cena:estado:luz …`).
- **QA** (Chrome via CDP, sem dependências): `node design/jornada/tools/cdp.mjs shots|checks|seam|tags|mobile|contrast|func|kb|wheel|perf`.
- Textos de interface novos ficam em `src/i18n/<idioma>.json` e `src/recipes/<id>/<idioma>.json` (`ask.*`, `cold.<id>.*`, `tag.*`). O build falha se faltar chave, se sobrar chave sem uso ou se pt e en divergirem.
- Endereços antigos `/es/`, `/it/`, `/zh/` redirecionam para `/en/` (idiomas removidos em nov/2026).

## Pendências

- "Ver o gesto" (coreografias sobre a cena) adiado: as animações do antigo player eram em estilo plano e não combinam com a pintura.
- Termos do glossário sublinhados no texto das etapas.
- Imagens OG e de receita (`--images`) redesenhadas com a ilustração (as atuais continuam válidas).
- Wake Lock durante a sessão inteira (hoje só no timer).
- Índice em folha com busca no mobile (hoje uma lista simples num `<dialog>`).
- Desligar `#paint` por aparelho (`deviceMemory`) só se a medição em aparelho real pedir.
- Panetti e potes são desenhados pelo JS: sem JS a bandeja aparece vazia.
