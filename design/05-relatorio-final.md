# 05 · Relatório final — redesign imersivo "Luce di Forno"

Estado em 15/nov/2026, branch `redesign-imersivo`, **nada commitado**. `python3 build.py` → `ok`.

## Orquestração efetivamente executada
| Etapa | Modelo (parâmetro `model` do Agent) | Resultado | Documento |
|---|---|---|---|
| Diagnóstico | Opus (sessão principal) | concluído | `00-diagnostico.md` |
| Direção de arte | `fable` (Fable 5.2) — interrompido por limite de uso às ~11h50, retomado às 12h e concluído | concluído | `01-direcao-de-arte.md`, `mockup/index.html` |
| Arquitetura | `opus` | concluído | `02-arquitetura.md` |
| Implementação | `sonnet` | etapas 0–11 do plano | `03-implementacao.md` |
| Auditoria independente | `opus` — interrompida por limite de uso, retomada às 18h20 | 0 P0 · 5 P1 · 17 P2 | `04-auditoria.md` |
| Correções | `sonnet` | 5 P1 + P2 baratos | `03-implementacao.md` § Correções pós-auditoria |
| Validação final | Opus (sessão principal) | 1 regressão residual achada e corrigida (abaixo) | este arquivo |

## 1. Diagnóstico do original
Site estático (Python → `docs/`, pré-render no Chrome), herói e palco das etapas em three.js/WebGL (`world3d.js`, ~600 KB de módulo via CDN), visual de "dashboard em cartões", nenhuma fotografia acima da dobra. Detalhes em `00`.

## 2. Conceitos avaliados e escolha
Cinematic Scroll Journey, Immersive Editorial Experience e Visual Storytelling Landscape (tabela comparativa em `01` §2). Escolhido **híbrido "Luce di Forno"**: base editorial + câmera cinematográfica só no herói e nas aberturas de capítulo. O Landscape foi descartado porque o acervo não tem panorâmica e porque tabela, checkboxes e timer não podem flutuar sobre a foto.

## 3. Design e arquitetura implementados
- Uma foto fixa atrás de toda a página (`.scene`, `position:fixed`, sem `background-attachment`); as ferramentas vivem em "folhas" opacas que deslizam por cima; entre elas, "janelas" (II O tempo, III O gesto, IV O fogo) e uma cena final mostram o mesmo cenário em outro enquadramento.
- Câmera = CSS gerado pelo build a partir de `scene.takes` em cada `recipe.json` (translate/scale por tomada e por breakpoint). `src/scene.js` (~4 KB) só troca `data-take` via IntersectionObserver — nenhum ouvinte de scroll, sem scroll-jacking. Movimento reduzido: composição estática, troca só fora da vista.
- Heróis: napolitana = `oro` (CC0), New York = `nyslice` (CC0); segunda foto lazy (`leopard` / `nyfold`). Recorte mobile próprio via `<picture>`.
- Imagens: `python3 build.py --scene` gera AVIF (27) + 1 JPG de fallback por foto/recorte em `docs/img/scene/` (4,4 MB, única cópia versionada); originais em `src/photos/originals/` (gitignored). Preload só do AVIF do herói com `fetchpriority=high`.
- Tipografia: Fraunces (display), Atkinson Hyperlegible Next (texto), JetBrains Mono (números); 122 KB de fontes.
- Player SVG (GSAP) substitui o palco 3D: sticky ao lado das etapas ≥1100 px, sincronizado com a etapa em foco; "Ver o gesto" abaixo disso.

## 4. 3D removido
Arquivos apagados: `src/world3d.js`, `src/style-3d.css`. Removidos do template/build: importmap three@0.169.0, `#hero3d`, `#stage3d`, botões `st3*`, classe `.has-3d`, `WORLD_JS`; menções a "3D" em textos, README e SEO. Dependência que sai: three.js (jsDelivr). Dependência mantida: GSAP 3.12.2 (player).

## 5. Arquivos modificados
`build.py`, `src/template.html`, `src/style.css` (reescrito), `src/player.js`, `src/scene.js` (novo), `src/i18n/{pt,en}.json`, `src/recipes/*/{recipe,pt,en}.json`, `src/photos/photos.json`, `src/photos/scene/manifest.json` (novo), `docs/` (gerado), `docs/img/scene/` (novo), `README.md`, `.gitignore`.

## 6. Evidências
- Auditoria (`04`): navegação por Tab, JSON-LD válido nas 4 páginas, sem rolagem horizontal de 360 a 1920 px, sem erros de console, sequência de tomadas por rolagem e por âncora, LCP/CLS medidos (4G lento simulado + CPU 4×): LCP 2,2–2,6 s mobile / 3,5–3,7 s desktop (servidor local sem gzip), CLS ≤ 0,065.
- Correções (`03`, capturas em `design/qa/pos/`): herói = 100% da altura em 1440×900, 1366×768, 1280×720; texto do herói mobile termina antes de 50%; contraste do herói ≥ 15:1 no pior pixel; alvos de toque com 44 px de altura.
- Validação final (capturas CDP com emulação de dispositivo em `design/qa/final/`): 375×812 claro/escuro, 768×1024, 1280×720, 1440×900, napolitana e New York.
  - **Achado e corrigido nesta etapa:** ao saltar para "Receita", a topbar continuava transparente sobre a faixa de KPIs em 1280×720 e, no celular, o crédito da foto passava por baixo da marca. `scene.js` agora decide a transparência pelo topo da faixa de KPIs (com folga de 25% da altura). Re-medido: `on-hero` = verdadeiro no topo e falso em `#receita` nos 4 tamanhos.
  - Interações no painel do navegador: ± pizzas (5→6), check de etapa (1/13), diagnóstico, modo por pizzas, reset, `NP.player` presente, sem `importmap`/`canvas`, console sem erros.
- `design/qa/` (79 MB de capturas) está no `.gitignore`; não entra no repositório.

## 7. Limitações e pendências
- Não testado: Safari/iOS, Firefox, leitor de tela real, Lighthouse oficial, produção com gzip, INP em aparelho real, wake lock do timer.
- O painel de navegador do app, quando oculto, congela pintura e `requestAnimationFrame`; por isso as provas visuais finais usam Chrome via CDP. O timer não pôde ser cronometrado no painel oculto (a auditoria o validou via CDP).
- Imagens OG (compartilhamento) continuam na identidade antiga.
- LCP desktop em rede lenta acima de 2,5 s no servidor local; medir em produção.
- Etapa 12 do plano (zoom do herói ao rolar, entrada do texto das janelas) não implementada.
- O site publicado (napoliprotocol.com) só muda após commit + push para o GitHub Pages.
