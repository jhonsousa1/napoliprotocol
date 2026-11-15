# 04 · Auditoria independente do redesign "Luce di Forno"

Branch `redesign-imersivo`, árvore de trabalho não commitada (snapshot de 15/11/2026). Auditor sem participação na implementação. **Nada foi corrigido**: este documento só aponta.

Referências: `design/01-direcao-de-arte.md` (doc 01), `design/02-arquitetura.md` (doc 02, que prevalece onde contradiz o 01), `design/03-implementacao.md` (relatório do implementador, verificado e não aceito como prova).

Prioridades: **P0** bloqueia publicar · **P1** importante, corrigir antes do merge · **P2** menor / dívida.

## Resumo

| Prioridade | Quantidade |
|---|---|
| P0 | 0 |
| P1 | 5 |
| P2 | 17 |

Veredito: o redesign está funcional e fiel ao conceito em desktop. Não encontrei nada que quebre a ferramenta (calculadora, cronograma, etapas, timer, diagnóstico, player e JSON-LD passaram em teste automatizado real). Os problemas sérios estão no **herói mobile** (o texto invade a foto, falha de contraste AA e enquadramento NY fora do critério) e no **salto para `#receita`** (topbar transparente sobre a faixa de KPIs).

---

## P1 · Importantes

### P1-1 · Salto para `#receita` (nav "Receita" e link "Pular para a receita") deixa a topbar transparente sobre a faixa de KPIs, e a faixa fica sob a barra
- **Evidência:** `design/qa/audit/pt-1440x900-light-receita.png`: "NapoliProtocol" e os links da nav aparecem por cima de "MASSA TOTAL / PANETTI / FORNO…". Medição com `/pt/#receita` em 1440×900: `scrollY=891`, `.topbar.on-hero = true`, topo visual da `.kpis = 8 px` (o `translate: 0 -64px` em `src/style.css:177` sobe a faixa para baixo da barra de 60 px). Mesmo resultado em 1440×900 sem e com reduced motion.
- **Causa:** o herói mede 963 px (> 900, ver P1-4). Com `scroll-padding-top:72px` (`style.css:52`), o fim do herói fica a 72 px do topo, e o observador da topbar (`src/scene.js:37`, `rootMargin:'-70px 0px 0px 0px'`) ainda o considera visível por 2 px. A faixa de KPIs, deslocada −64 px, cai sob a barra.
- **Correção sugerida:** (a) margem do observador maior que o `scroll-padding` (ex.: `-80px`) ou observar um sentinela no fim do herói; (b) mirar a âncora na faixa: `#receita{scroll-margin-top: calc(72px + 64px)}` no desktop (ou mover o `id` para o `.chap` e manter a faixa visível acima).

### P1-2 · Herói mobile: texto pequeno sobre a foto abaixo de AA no tema claro
- **Evidência (amostragem de pixels com o texto oculto, pior pixel / percentil 95 do fundo sob a caixa do texto, `scratchpad/cdp/contrast.mjs`):**
  - `/pt/` 375×812 claro: `.byline small` ("versão 1.0 · outubro 2026", 12,5 px, `--scene-muted`) **2,62 : 1 (p95 3,22)**.
  - `/en/new-york/` 375×812 claro: mesmo elemento **2,40 : 1 (p95 3,91)**.
  - Tema escuro 375×812 `/pt/`: 4,50 (no limite).
  - Desktop 1440/1024/768 nos dois temas: todos os textos sobre a foto ≥ 5,3 (h1 ≥ 6,4; lead ≥ 7,3; janelas ≥ 8,5; rodapé ≥ 8,0). Desktop está ok.
- **Regra violada:** doc 01 §6.5 itens 3 e 4 ("véu mínimo 62% sob texto creme"; "texto pequeno em `scene-muted` exige fundo sólido") e critério 6.
- **Causa:** o bloco de texto termina a 59–62% da altura (P1-3), onde o véu mobile (`style.css:394`, 0,86·k em 50% → 0 em 70%) já está em ~50%. `.byline small` em `--scene-muted` sem pílula (`style.css:152`).
- **Correção:** encurtar o bloco (P1-3) **e** dar à assinatura cor `--scene-ink` ou pílula sólida; alternativamente estender o véu mobile até o fim real do texto (ex.: 0,86·k até 62%, 0 em 78%).

### P1-3 · Herói mobile não cumpre o enquadramento do doc 01 (texto passa de 50%; NY com foto começando em 10%)
- **Evidência (`scratchpad/cdp/hero.mjs`, fim da assinatura em % da altura / início da foto):**
  - `/pt/` 375×812: texto até **59%**, foto em 34% · 390×844: 52% / 34%.
  - `/pt/new-york/` e `/en/new-york/` 375×812: texto até **62%**, foto começa em **10%** (critério: 30–38%) · 390×844: 60% / 10%.
  - Capturas: `pt-375x812-dark-hero.png`, `ptny-375x812-light-hero.png` (o lead e a assinatura da NY ficam por cima do queijo claro; a pílula "Próximo" ocupa 2 linhas no meio da foto).
- **Critério violado:** doc 01 §10.2 ("a foto começa entre 30% e 38%; o texto termina antes de 50%"). A NY mobile é a que mais sofre: `crop_m` foi alterado para `[0,37,70,63]` (doc 03, desvio 2) e o foco `m` não foi recalculado para manter a foto em 30–38%.
- **Correção:** encurtar o conteúdo do herói mobile (lead de 4–6 linhas é longo: limitar a ~3 linhas com `-webkit-line-clamp` ou texto curto específico; mover a pílula "Próximo" para baixo do seletor ou para a folha I); reajustar `scene.takes.hero.m` da New York (`f`/`a`/`s`) para a foto nascer em ~34%.

### P1-4 · Herói desktop passa de 100svh nos tamanhos de notebook mais comuns e esconde a "folha que sobe"
- **Evidência (`hero.mjs`):** `/pt/` 1440×900 = 963 px (107%); 1366×768 = 858 (112%); 1280×720 = 844 (117%); `/en/new-york/` 1366×768 = 918 (120%), 1280×720 = 901 (125%), 1024×768 = 851 (111%). A faixa de KPIs (que deveria "cavalgar a borda", doc 01 §5.1) fica fora do primeiro viewport em 1366 e 1280; em 1440×900 aparece 1 px. Comparar `mockup-1440x900-hero.png` (faixa visível) com `pt-1440x900-light-hero.png`.
- **Critério:** doc 01 §10.1 ("herói com 100svh"). O doc 03 registrou como "aceito pelo plano", mas o plano só aceita crescer em telas **baixas** (mobile 360×640), não em 1440×900.
- **Causa:** `padding:96px 0 136px` (`style.css:132`) + h1 em 3 linhas a 100 px + pílula "Próximo" + seletor.
- **Correção:** reduzir o padding inferior quando a altura é curta (`@media (max-height:920px)`), limitar `--t-hero` também pela altura (`min(7vw, 11vh)`), e/ou colocar "Próximo" e seletor lado a lado.

### P1-5 · Alvos de toque abaixo de 44 px e capítulos do player com 6 px
- **Evidência (CSS):** `.theme-btn` 40×40 (`style.css:114`; 38×38 ≤ 560 px, `:451`); `.lang summary` 40 px de altura (`:120`); `.btn.small` 40 px (`:74`: "Ajustar", "Restaurar padrão", "Limpar marcações", "Aplicar" do diagnóstico); `.seg button` 40 px (`:200`, aceito pelo doc 01); barras de capítulo do player `#plChap button` com **6 px de altura** (`:258`), clicáveis e focáveis.
- **Critério:** doc 01 §6.3 e §10.18 ("alvos ≥ 44×44"); WCAG 2.5.8 pede ≥ 24 px. Os capítulos do player falham até o mínimo de 24 px; tema, idioma, "Ajustar" e "Aplicar" ficam abaixo dos 44 px do próprio plano e são usados no celular com mão suja.
- **Correção:** 44 px nos botões da topbar e `.btn.small`; capítulos com área de toque de 24–44 px por pseudo-elemento (`button::before{content:"";position:absolute;inset:-12px 0}`) mantendo a barra visual de 6 px.

---

## P2 · Menores

| # | Item | Evidência | Correção sugerida |
|---|---|---|---|
| P2-1 | **Reduced motion: as tomadas trocam à vista em 1440×900**, contrariando "troca fora de vista" (doc 01 §9, critério 21) | `cam.mjs` com `prefers-reduced-motion`: `hero→tempo` em `scrollY=800` com o fim do herói ainda visível (163 px); `tempo→gesto` em 2440 com a janela "tempo" visível (−309..303). Causa: `rootMargin` inferior de 50% (`scene.js:23`) dispara a 1,5 viewport, mas as folhas Receita (1168 px) e Cronograma (1036 px) são menores que 1,35 viewport. Em 375×812 ok | Trocar quando o marcador anterior **sair** do viewport (observar o fim da janela anterior) em vez de margem fixa, ou margem = altura real da folha seguinte |
| P2-2 | Fontes: 214 KB por página (teto do doc 02 §4.6: 160 KB) e `<link>` do Google Fonts bloqueia a renderização: o LCP sai preso às fontes | Rede: 4 woff2 (Fraunces normal + itálico ~70 KB cada, Atkinson Next, JetBrains); sem limitação o `css2` levou ~930 ms e o LCP ficou entre 1,0 e 2,8 s conforme a latência externa | Subconjunto `text=`/`latin`, auto-hospedar Fraunces com só os eixos usados, `preload` do woff2 do h1 |
| P2-3 | LCP com rede "4G lento" simulada (150 ms, 1,6 Mbps, CPU 4×): mobile 390×844@3x **2,61 s** (`/pt/`) e 2,24 s (NY); desktop 1440×900@2x **3,47 s** (`/pt/`) e 3,66 s (NY). Meta 2,5 s | `perf.mjs`; elemento LCP = foto do herói em todos. Atenuante: o servidor local não comprime; em produção o HTML cai de 187 KB para 49 KB (gzip -9), o que deve trazer o mobile para baixo de 2,5 s. Desktop sob 4G lento é mais rigoroso que o critério (Lighthouse mobile) | Medir no Lighthouse em produção; se persistir, P2-2 e `d-2560` como teto de preload em DPR 2 |
| P2-4 | CLS desktop `/pt/` 0,045 na carga e **0,065** após rolar (alvo interno ≤ 0,05; limite 0,1 ok). Mobile 0,022 / NY 0,006 | `perf.mjs`: deslocamentos em `.wrap`/`.sheet-first`/`.qcard`/`.next` na carga (pílula "Próximo" e textos inseridos pelo JS, troca de fonte) e em `.ctrl`/`.waitchip`/`.tip` do player ao trocar de cena durante a rolagem (a legenda muda de altura) | Reservar altura da pílula `#nextEv`; altura fixa da legenda do player no modo sticky (já há `overflow:auto`, falta `height` em vez de `min-height`) |
| P2-5 | Player: "Próxima", "Anterior", "Repetir" e "Ver o gesto" tocam a cena mas deixam o modo em **Bancada** (`playing=true`, `#plFilm aria-pressed=false`); clicar "Filme" com o player parado não toca nada; ao pausar, a cena não volta para a etapa em foco até a próxima interseção | `pl2.mjs`: após `#plNext` → `mode=bench, playing=true`; `src/player.js:337-338` | Em `go(i,true)` chamar `setMode('film')`; ao pausar, ressincronizar com a `.step.cur` |
| P2-6 | Estrutura e conteúdo do herói mobile: a pílula "Próximo" e a assinatura com versão consomem ~20% da altura | `pt-375x812-dark-hero.png` | Ver P1-3 |
| P2-7 | Imagens OG ainda na identidade antiga (fundo creme, tricolor, círculo "JS") | `docs/img/og-pt.png` | Etapa 12 do plano (`card_html` com foto + Fraunces) |
| P2-8 | Derivadas JPG muito pesadas para um fallback: `oro-d-1920.jpg` 756 KB, `leopard-d-1920.jpg` 788 KB, `nyslice-d-1920.jpg` 869 KB, `*-m-1200.jpg` 317–543 KB. JPG = 4,6 MB dos 12,1 MB de derivadas | `ls -la src/photos/scene`; `sips formatOptions 78` não parece estar reduzindo | Ver seção "Peso do repositório" |
| P2-9 | WebP desktop sem uso prático (só navegadores sem AVIF) e `d-2560.webp` 344–425 KB | idem | Ver seção "Peso do repositório" |
| P2-10 | Faixa do timer: o texto diz "Faixa laranja: 25–30 s" mas a zona é ouro (`--ember:var(--oro)` no timer, `style.css:307`) | `pt-1440x900-light-forno.png` | Ajustar texto (`oven.note`) para "dourada" ou usar `#F26A47` na zona |
| P2-11 | Palco do player com faixas de outra cor acima e abaixo do SVG (letterbox) | `pt-375x812-dark-passos.png`, `pt-1440x900-light-passos.png` (faixa clara acima do palco) | `preserveAspectRatio="xMidYMid slice"` no `#stg` ou fundo do SVG = gradiente do `.stagebox` |
| P2-12 | Botões `#qMinus`/`#qPlus` com `aria-label="−"` e `"+"` (nome acessível pobre; leitor diz "menos"/"mais" sem contexto) | `src/template.html:49` | `aria-label="{{panel.fewer}}"` / "Uma pizza a mais" |
| P2-13 | `FIN_CREDIT` montado com `.replace()` sobre o HTML de `credit_html` para trocar o rótulo | `build.py` em `page()` (`'FIN_CREDIT': credit_html(...).replace(...)`) | Parâmetro `label` em `credit_html()` |
| P2-14 | CSS e JS embutidos sem minificação (comentários vão para as 4 páginas; `style.css` 38 KB, `player.js` 31 KB por página) | `docs/pt/index.html` 187 KB (49 KB gzip; antes 210/57 KB, portanto melhorou) | Minificação simples no build (remover comentários e espaços) |
| P2-15 | Chaves i18n sem uso (`foot.photos`, `player.sub`), e WebP/JPG gerados para fotos que só aparecem como `m` ou `d` | doc 03 "Problemas conhecidos"; `build.py` `WEBP_W`/`JPG_W` | Remover chaves; ver seção seguinte |

---

## Peso do repositório: 14 MB de derivadas + cópia em `docs/` (pergunta 7)

Medido: `src/photos/scene/` = 12,1 MB em 59 arquivos (`du` 14 MB) e `docs/img/scene/` = 12 MB idênticos. Por formato: **JPG 4,64 MB, WebP 4,41 MB, AVIF 3,09 MB**. O `.git` atual tem 15 MB: commitar como está quase **dobra o repositório** (+24 MB, e cada `--scene` futuro soma de novo, já que binários não deltam).

O que é efetivamente baixado: só AVIF (todos os navegadores atuais; medido: `oro-d-3200.avif` 251 KB, `oro-m-1600.avif` 121 KB, `leopard-*` sob demanda). WebP e JPG servem apenas Safari < 16 e navegadores muito antigos.

**Recomendação: reduzir antes do primeiro commit (P2, mas decidir agora porque commit de binário é permanente no histórico).**
1. JPG: um único fallback por foto, `d-1280` em qualidade ~70 (≈150–200 KB). Corta ~4 MB.
2. WebP: só uma largura por variante (`d-1920`, `m-1200`) ou nenhuma. Corta 3–4 MB.
3. Não duplicar: servir `docs/img/scene/` como única cópia versionada e gerar a partir dos originais (que já ficam fora do git), em vez de versionar `src/photos/scene/` **e** `docs/img/scene/`. Se `src/photos/scene/` precisa existir para o build, colocá-lo no `.gitignore` e manter só o `manifest.json` versionado.
Com 1+2+3 o acréscimo fica em ~4–5 MB, aceitável.

---

## Fidelidade ao plano (pergunta 1)

Cumprido e verificado:
- Cenário fixo + folhas + 3 janelas + cena final, nas 4 páginas; tomadas `hero → tempo → gesto → fogo → fim` trocam ao rolar (gatilho a 90% da altura, medido: `tempo` dispara com o topo da janela em 796 px de 900); fusão `oro → leopard` com a foto já enquadrada; `cut` sem transição em saltos por âncora (`/pt/#forno` e `#sobre` abrem direto em `fogo` com `leopard` carregada).
- Câmera em CSS gerado (`<style id="scene-css">`), sem `data-take` no HTML gravado; `scene.js` 2,6 KB sem minificar, **sem ouvinte de scroll** (grep sem resultado; só IO).
- 3D removido: nenhum `three`, `importmap`, `world3d`, `has-3d`, `canvas` em `docs/` e `src/`; README e descrição raiz sem "3D". `theme-color` `#120E0C`.
- Tokens do doc 01 aplicados; `style-3d.css` apagado; player herda tokens.
- Player sticky ≥ 1100×760 e sincronizado com a etapa em foco (13/13 etapas casaram); botão "Ver o gesto" < 1100 px.
- Preload do herói gerado pela mesma função dos `<source>`: **sem download duplicado** (1 requisição por foto em todas as medições); segunda foto só sob demanda.

Desvios documentados no doc 03 e aceitáveis: cantos arredondados na primeira folha, `.chap` como `div`, ajuste das tomadas NY, regra de `min-aspect-ratio` para `s<1`, `sizes` mobile com `max()`.

Cortado ou divergente **sem justificativa suficiente**:
- Herói > 100svh em desktop comum (P1-4) e enquadramento mobile (P1-3): tratados no doc 03 como "aceito pelo plano", o que não é verdade fora de telas baixas.
- Imagens OG (P2-7): estavam na etapa opcional, mas mantêm a identidade antiga (fundo creme, círculo "JS" que o plano mandou remover).
- Etapa 12 (texto das janelas esfregado) não feita: aceitável, era opcional.

## Funcionalidades preservadas (pergunta 5): todas passaram

Teste automatizado via CDP (`scratchpad/cdp/func.mjs`) em `/pt/` 1440×900, `/pt/` 1024×768 e `/en/new-york/` 375×812, sem erros nem avisos de console:
- Calculadora: farinha 1000 g → KPI 1.685 g, tabela e resumo atualizam; modo pizzas mostra/oculta campos; ± pizzas (5→6→7→8→6) sincroniza input; persistência após recarregar; "Restaurar padrão" volta a 800 g / 1.348 g.
- Cronograma: 7 eventos (NY 5), `next-ev` marcado, pílula "Próximo" correta; data no passado mostra o alerta e esconde "Próximo".
- Etapas: check marca, recolhe, progresso `1/13` e barra 7,69%; persiste; "Limpar marcações" zera.
- Timer: inicia, pausa ("Continuar"), zera. Diagnóstico: chip → "Aplicar" → fundo 380→370 °C, botão desabilitado.
- Player: anterior/próxima, play → modo Filme, pausa → Bancada, capítulos; sincronia com etapa (ver P2-5 para inconsistências de modo).
- Tema (alternância + `np-theme`), idioma (`np-lang`), abas de receita, painel recolhível no mobile.
- HTML gravado: `ld-recipe` válido nas 4 páginas (Recipe, 13/12 passos, 9 ingredientes, 3 imagens); 1 `h1`, 6 `h2`, 1 `header`/`main`/`footer`; sem `data-theme`, `on-hero` ou `step done`.
- Raiz `/` redireciona por idioma; `/es/new-york/#forno` → `/en/new-york/#forno` (hash preservado); 404 bilíngue na paleta nova; `.nojekyll`, `CNAME`, `sitemap.xml`, `robots.txt` presentes.
- Sem rolagem horizontal (`scrollWidth = innerWidth`) em 1920, 1440, 1366, 1280, 1024, 768, 390, 375 e 360; tabela sem rolagem interna em 1440, 1024 e 375.

## Teclado, foco e landmarks (pergunta 6)

Teste com Tab real via CDP (`scratchpad/cdp/kb.mjs`, `/pt/` 1440×900), 45 paradas a partir do topo:
- Ordem coerente: skip link → marca → 7 links da nav → tema → idioma → abas de receita → assinatura → "Próximo" → ± pizzas → crédito da foto → segmentado → 11 campos → restaurar/limpar → cronograma → capítulos do player…
- Foco visível de 3 px em **ouro** sobre a cena (topbar transparente, herói, crédito) e em **accent** nas folhas: ok.
- Campos numéricos e data: `outline:none` (`style.css:197`, `:225`); o foco aparece só pela borda `accent` + halo de 3 px a 25%. Visível, mas o halo a 25% não chega a 3:1 e foge da regra "outline 3 px" do doc 01 §6.3 (P2-16).
- Skip link: Enter leva a `#receita` (`scrollY=891`), e o próximo Tab cai em "Por farinha": funciona, mas com o defeito de P1-1 (topbar transparente sobre a faixa).
- Capítulos do player: alvo de foco de **32×6 px** (confirma P1-5); links do crédito com 16 px de altura.
- Landmarks: 1 `header`, 1 `main`, 1 `footer`; navs rotuladas "Seções", "Receitas", "Receitas", "Idiomas" (dois `nav` com o mesmo rótulo "Receitas", herói e rodapé: P2-17); `.scene` com `aria-hidden="true"` e `alt=""` nas duas fotos; nenhuma `img` sem `alt`; crédito com autor, licença e links no herói, na janela IV e no rodapé.
- `prefers-reduced-motion`: CSS global zera transições/animações (`style.css:477`); player respeita `reduced`; trocas de tomada **à vista** em 1440×900 (P2-1).

| # | Item | Evidência | Correção sugerida |
|---|---|---|---|
| P2-16 | Foco dos campos sem outline (só borda + halo a 25%) | `style.css:195-197`, `:224-225` | `.inp:focus-within{outline:3px solid var(--focus);outline-offset:2px}` |
| P2-17 | Dois `nav` rotulados "Receitas" | `template.html:41` e `:240` | Rodapé: "Outras receitas" ou remover o `nav` do rodapé |

## Contraste de tokens (pergunta 6)

Calculado (WCAG 2.x), todos ≥ 4,5 para texto e ≥ 3 para bordas: claro ink/bg 15,65; muted/bg 6,30; muted/surface-2 5,70; accent/bg 4,83; accent-ink/accent-soft 5,93; ember/ember-soft 5,38; basil/basil-soft 4,97; on-accent/accent 5,58; line-strong/bg 3,21 e /surface 3,62. Escuro ink/bg 16,52; muted/surface 7,64; accent/surface 5,80; accent/accent-soft 5,03; basil/basil-soft 6,68; ember/ember-soft 7,11; line-strong/bg 3,79 e /surface 3,47. Cena: scene-muted/scene 12,05; oro/scene 10,57. O problema de contraste está só no texto sobre foto no mobile (P1-2).

## Desempenho (pergunta 7)

| Página / viewport (4G lento + CPU 4×) | LCP | CLS carga → após rolar | Imagens até o 1º viewport | Total ao rolar a página |
|---|---|---|---|---|
| `/pt/` 390×844@3 | 2,61 s (foto) | 0,022 → 0,022 | 121 KB (`oro-m-1600.avif`) | 1,20 MB |
| `/pt/` 1440×900@2 | 3,47 s (foto) | 0,045 → 0,065 | 251 KB (`oro-d-3200.avif`) | 1,22 MB* |
| `/en/new-york/` 390×844@3 | 2,24 s | 0,006 → 0,006 | 100 KB | 1,12 MB |
| `/en/new-york/` 1440×900@2 | 3,66 s | 0,027 → 0,040 | 300 KB | 1,07 MB |

\* Sem limitação, rolando até o fim em 1440@2x a página baixa 3,2 MB, dos quais 2,5 MB são as figuras JPG 1400 px das etapas/Sobre (`figure()`, inalterado pelo redesign; adiado no doc 02 §4.5). HTML 187 KB (49 KB gzip), JS de terceiros só GSAP. Orçamentos de imagem do herói (≤ 200/330 KB) cumpridos. Tarefas longas: 1–2 de 51–59 ms só na carga (init do app/GSAP), **nenhuma durante a rolagem**.

## O que foi testado / não testado

Testado de fato: `python3 build.py` (termina em `ok`, ~8 s); Chrome headless 157 via CDP (script próprio em `scratchpad/cdp/`) com viewports 1920×1080, 1440×900, 1366×768, 1280×720, 1024×768, 768×1024, 390×844, 375×812, 360×640, temas claro e escuro (via `np-theme`), reduced motion emulado; screenshots em `design/qa/audit/` (sequências completas `pt` 1440 claro, `pt` 375 escuro, `enny` 1440 escuro, `ptny` 375 claro, mockup de referência, 404); medição de LCP/CLS/longtask com `PerformanceObserver`, rede por requisição, contraste por amostragem de pixels, interações funcionais, troca de tomadas por rolagem passo a passo e por deep link, redirecionamentos.

Não testado: Safari/iOS (risco de `translate` com `clamp()` e `lvh`, doc 02 §10), Firefox, leitor de tela real, Lighthouse oficial, rede/servidor de produção com gzip, INP real em aparelho Android, wake lock do timer, tema automático por horário (só o manual), variante sem JavaScript.
