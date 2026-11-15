# 00 · Diagnóstico do site atual (branch `redesign-imersivo`, commit e2615d9)

## Stack
- Site estático gerado por `build.py` (Python 3, sem dependências) a partir de `src/template.html` com placeholders `{{chave}}`.
- Cada página é pré-renderizada no Chrome headless (`--dump-dom ?prerender=1`) para SEO (passos, quantidades e JSON-LD já no HTML).
- Publicação: GitHub Pages serve `docs/` (domínio napoliprotocol.com). Servidor local: `.claude/launch.json` → `python3 -m http.server 8766 --directory docs`.
- CSS e JS são **embutidos inline** em cada página (`{{CSS}}`, `{{IL}}`, `{{PLAYER_JS}}`, `{{WORLD_JS}}`).
- Rotas: `/pt/`, `/en/` (napolitana), `/pt/new-york/`, `/en/new-york/`; raiz `/` redireciona por idioma; `/es/ /it/ /zh/` redirecionam para `/en/`; `404.html`.
- Textos: `src/i18n/<lang>.json` (comuns) + `src/recipes/<id>/<lang>.json` (receita). O build falha se faltar chave ou se termos da napolitana vazarem para outra receita.

## Experiência 3D atual (a remover)
| Peça | Onde | Papel |
|---|---|---|
| `src/world3d.js` (410 linhas) | módulo ES inline + `importmap` para three@0.169.0 no jsDelivr | mundo procedural da bancada; pizza 3D no herói (`#hero3d`) e "palco" sticky nas etapas (`#stage3d`) com tomadas por etapa |
| `src/style-3d.css` (113 linhas) | concatenado ao `style.css` | tokens de cor/tipo da identidade atual (Bricolage/Atkinson) **+** layout do herói 3D, palco sticky, `.has-3d` |
| `.has-3d` | classe no `<html>` posta pelo world3d | esconde o player SVG (`#assistir`), esconde ilustrações das etapas, recolhe o painel |
| GSAP 3.12.2 (cdnjs) | `<script>` | usado pelo world3d **e pelo player SVG** (`src/player.js`) → GSAP fica |

Custo atual: three.js (~600 KB módulo) + addons + texturas em canvas + WebGL contínuo; o herói depende de WebGL para ter imagem; sem WebGL o herói fica só texto.

## Layout e identidade atuais
- Topbar sticky com faixa tricolor, nav de 7 âncoras, progresso de etapas, tema, idioma.
- Herói em 2 colunas (texto + cena 3D), KPIs em 4 cartões, seletor rápido de nº de pizzas.
- Painel de parâmetros recolhível; seções empilhadas em cartões brancos sobre fundo neutro: Receita (tabela), Cronograma (timeline), Assista (player SVG — escondido quando há 3D), Passo a passo, Forno (timer + diagnóstico), Regras + glossário, Sobre (fotos, fatos, textos).
- Tipografia: Bricolage Grotesque (display 800), Atkinson Hyperlegible (texto), JetBrains Mono (números). Vermelho tomate `#D63A1C` como cor forte.
- Modo escuro automático 19h–7h com botão; cores definidas para os dois temas.
- Diagnóstico visual: sensação de "app/dashboard em cartões"; seções são blocos independentes; nenhuma fotografia acima da dobra (a foto real só aparece dentro das etapas e no Sobre).
- Mobile: herói 3D vai para o topo com 300 px, palco sticky ocupa 44vh sobre as etapas (pesado em telas pequenas).

## Precisa ser preservado (funcional)
calculadora (modo farinha/pizzas, parâmetros, reset, localStorage), tabela da receita, divisão de água/panetti/coberturas, alertas, cronograma com data/horário e "próximo evento", player SVG animado, etapas com marcação "concluído" + barra de progresso, timer do forno com wake lock, diagnóstico com "aplicar", regras, glossário, Sobre com fotos e créditos/licenças, abas de receita, menu de idioma, tema, JSON-LD, pré-render, redirecionamentos, sitemap/robots/CNAME, imagens OG.

## Ativos de imagem disponíveis
Fotos reais da Wikimedia Commons já usadas (máx. 1400 px no repositório). Os originais têm alta resolução, p.ex.:
- L'Oro di Napoli (Sarah Stierch, **CC0**) 5712×4284 — pizza napolitana sobre mesa de madeira, luz quente.
- Pizza Napoletana Contemporanea (CDibisceglia, CC BY-SA 4.0) 4000×3000 — cornicione com leopardatura.
- Pizza in Naples (Glen MacLarty, CC BY 2.0) 2102×1402 — pizzaiolo e forno a lenha.
- Outras: pelati 5712×4284 (CC BY-SA), dough 2988×5312 (CC BY 2.0), peel 2252×1756 (PD).
Ferramentas locais: `cwebp`, `avifenc`, `sips` (sem ImageMagick/PIL).

## Oportunidades
- Remover three.js/importmap/world3d → menos JS, sem WebGL, herói com LCP de imagem otimizada.
- Uma única fonte de tokens (hoje `style.css` e `style-3d.css` se sobrepõem).
- Recuperar o player SVG como a "demonstração animada" (já existe, leve, acessível) no lugar do palco 3D.
- Imagens: hoje só JPG; adicionar AVIF/WebP + `srcset` + dimensões explícitas.
