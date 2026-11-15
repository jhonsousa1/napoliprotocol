# 03 · Implementação do redesign "Luce di Forno"

Branch `redesign-imersivo`. Nada foi commitado (instrução do pedido): tudo está na árvore de trabalho. Mensagens de commit sugeridas pelo plano (para quando houver commits), uma por etapa:

0. (commit do `.gitignore`: `src/photos/originals/`)
1. `Build: pré-render falha se um trecho dinâmico não for encontrado`
2. `Remove o mundo 3D (three.js, importmap, world3d, style-3d)`
3. `Imagens de cenário: derivadas AVIF/WebP/JPG geradas por build.py --scene`
4. `Tokens e tipografia Luce di Forno`
5. `Herói fotográfico com cenário fixo em CSS`
6. `Layout editorial: folhas, capítulos, janelas e cena final`
7. `Câmera do cenário: tomadas por janela com CSS e IntersectionObserver`
8. `Player sincronizado com a etapa em foco; player no lugar do palco 3D`
9. `Forno, regras e sobre na nova identidade; ajustes mobile`
10. `Raiz, 404 e redirecionamentos na identidade nova; README`

## Etapas concluídas

0 a 11 concluídas; a 12 (polimento opcional) não foi feita. As etapas 4, 5, 6, 7 e 9 (CSS e template) foram escritas numa única passada (o `style.css` e o `template.html` foram reescritos de uma vez, a partir do mockup), e verificadas depois por checkpoints em vez de commit a commit.

## Arquivos

**Criados:** `src/scene.js`, `src/photos/scene/` (59 derivadas + `manifest.json`, 14 MB), `design/03-implementacao.md`, `design/qa/*.png`.
**Removidos:** `src/world3d.js`, `src/style-3d.css`.
**Alterados:** `build.py`, `src/template.html`, `src/style.css` (reescrito), `src/player.js`, `src/photos/photos.json` (`ow`, `oh`, `crop_d`, `crop_m`), `src/recipes/*/recipe.json` (bloco `scene`), `src/recipes/*/{pt,en}.json` (textos das janelas), `src/i18n/{pt,en}.json` (`chap.1`…`chap.6`, `nav.skip`, `foot.bgphoto`, `js.player.see`), `README.md`, `.gitignore` (já vinha modificado), `docs/**` (regenerado).
**Temporário apagado ao final:** `docs/_qa.html` (página-ponte de QA).

## O que mudou no build (`build.py`)

- Pré-render com `re.subn` + `assert` para os 4 trechos dinâmicos (padrões afrouxados: aceitam `hidden=""`), mais asserts de "sem `step done`" e "`#assistir` sem `hidden`".
- Remoção do 3D (WORLD_JS, style-3d, `theme-color` agora `#120E0C`, descrição raiz).
- `python3 build.py --scene`: sRGB → recorte via `cwebp -lossless -crop` → AVIF/WebP/JPG, `manifest.json`, tabela de pesos e avisos. Sem original: `skip`.
- `credit_links/credit_html`, `scene_validate`, `scene_css`, `scene_markup`, `scene_sources` (usada pelo `<picture>` **e** pelo preload), `scene_preload`, `win_html`, `emph`, `H1`, `HERO_CREDIT`, `FIN_*`, `HTML_STYLE`, `SCENE_JS`.
- Raiz, 404 (bilíngue, links para `/pt/` e `/en/`) e páginas aposentadas na paleta nova, sem web fonts.

## Desvios do plano e motivo

1. **Etapas 4–9 em uma passada** (ver acima): o CSS intermediário seria reescrito de qualquer jeito.
2. **Tomadas da New York** (ajuste fino previsto no plano): `hero.d` passou a `s=1.30`, `f=[45,69]` (a lata de cerveja ficava legível em 1440); `gesto.d.a=[70,30]` e `fogo.d.a=[68,15]` para alinhar a base e deixar a lata fora do quadro. `crop_m` de `nyslice` de `[0,30,70,70]` para `[0,37,70,63]` (a lata aparecia no topo das janelas mobile, sem véu). Valores originais do plano ficam como referência no doc 02.
3. **Escala mobile do herói em telas largas**: com `s<1` a foto não cobre a largura em retrato "largo" (768×1024 deixava uma faixa preta). O build emite, para tomadas mobile com `s<1`, uma regra `@media (min-aspect-ratio: …) { --s:1 }`.
4. **`sizes` mobile** é `max(100vw, calc(100vh * A))` (o plano dizia só `calc(100vh * A)`): cobre celulares em paisagem. Preload usa a mesma string.
5. **Folhas com os quatro cantos arredondados**, inclusive a primeira (plano: só em cima), por coerência visual com as janelas abaixo.
6. **Cabeçalhos de capítulo são `<div class="chap">`**, não `<header>`, para ficar com um único `<header>` (a topbar). O título "Parâmetros" do painel é `<p>`, não `h2` (só capítulos têm `h2`).
7. Removido o selo `v1.0` fixo da marca na topbar (aparecia igual nas duas receitas). Chave i18n `foot.photos` ficou sem uso.
8. Realce do "próximo evento" no cronograma (anel no ponto, título em destaque): pequena adição em `renderSchedule` (classe `next-ev`), como no doc 01 §5.3.
9. Topbar: ≤ 1180 px a barra de progresso some e a nav encolhe (a 1024 a nav quebrava em duas linhas); o texto `n/N` continua.
10. Painel do player: em modo sticky o `.screen` tem `max-height: calc(100svh - 108px)` e a legenda rola, porque a 1440×900 o player passava da altura da tela e escondia os controles.
11. Tabela: reduzido o respiro horizontal ≤ 1240 px e ≤ 420 px (a napolitana rolava 11 px a 1024 e 19 px a 360).
12. Grep do 3D usa o padrão apertado `three\.module|three@|three/addons|importmap|has-3d|world3d|stage3d|hero3d` (a palavra "three" aparece em prosa: "three days").
13. **Tema nas capturas**: `--force-prefers-color-scheme` não muda o tema (o script inline decide pelo relógio/`np-theme`). Usei `docs/_qa.html` (temporária): grava `localStorage np-theme`, carrega a página num `<iframe>` com tamanho exato (o Chrome headless não vai abaixo de ~500 px de janela), rola até o alvo e **emula o IntersectionObserver** (que não dispara de forma confiável com tempo virtual): aplica `data-take`, `on-hero` e carrega as fotos lazy pela mesma regra do `scene.js`. O comportamento real do observador foi verificado no painel do navegador (abaixo).

## Verificações (método)

- `python3 build.py` termina em `ok` após cada etapa. `--scene`: 59 arquivos, sem avisos de peso (AVIF d-1920 119–158 KB, d-3200 224–292 KB, m-1200 67–82 KB, m-1600 97–118 KB); sem originais imprime `skip` e o manifesto é preservado.
- Grep do 3D em `docs/`: sem resultados (`exit=1`).
- HTML gravado (4 páginas): `ld-recipe` e `class="step"` presentes; nenhum `data-take` no `.scene`, nenhum `on-hero`, `step done`, `data-theme` no `<html>` ou `#assistir hidden`; `<ol class="tl" id="timeline"></ol>`; um só `<header>`, `<main>`, `<footer>`.
- Contrastes calculados (WCAG): batem com a tabela do plano (ink/bg 15,7 e 16,5; muted/bg 6,3 e 8,3; accent-ink/bg 6,6 e 6,3; on-accent/accent 5,6 e 6,3; cena 18,1/12,1/10,6).
- Painel do navegador, 1440×900 (rede): `/pt/` baixa só `oro-d-3200.avif` (246 KB, via preload, sem duplicata); `leopard` só carrega ao aproximar da janela IV; `/pt/#sobre` aberto do zero fica na tomada `fogo` com `leopard` visível.
- Tomadas (rolando de ponta a ponta): `hero → tempo → gesto → fogo → fim` com transições; foto inativa pré-posicionada; topbar `on-hero` só no herói.
- Funcional (`/en/`): ± pizzas atualiza KPIs/resumo; check marca e recolhe a etapa; progresso `2/13`; timer inicia/zera; diagnóstico mostra "Aplicar"; JSON-LD válido (Recipe, 13 passos); `NP.player` presente, modo padrão `bench`; play muda para `film`, pausa volta para `bench`; rolar durante o filme não troca a cena; sincronia marca uma `.step.cur` e troca a cena sem tocar; player sticky cabe em 1440×900 (140–868 px).
- Sem erros no console.
- Sem rolagem horizontal (`scrollWidth <= innerWidth`) em 360, 375, 768, 1024 e 1440 nas 4 páginas; tabela sem rolagem interna a 360, 375 e 1024.

## Screenshots (`design/qa/`)

Nome: `<página>-<largura>x<altura>-<tema>-<seção>.png` (`pt`, `en`, `nypt`, `ennyk`). Matriz: herói em 375, 768, 1024 e 1440 nos dois temas (pt e en/new-york), 360×640, herói das outras duas páginas, seções (receita, cronograma, passos, forno, regras, sobre) em 1440 e 375, janelas tempo/gesto/fogo, cena final, passos a 768 e 1024. Todas com `--force-prefers-reduced-motion` (transições desligadas, estado final).

Observações sobre as capturas: as janelas que usam foto secundária carregada sob demanda (`pt-*-win-fogo`, onde entra `leopard`) saem sem foto nas capturas headless (a imagem lazy não chega a carregar dentro do tempo virtual); no painel do navegador a janela IV mostra a foto normalmente nos dois temas (verificado por captura). Também há `pt-1440x900-*-nojs-hero.png` (página servida sem `<script>`: herói enquadrado, topbar sólida, sem pílula "Próximo"). A variante escura sem JS (`prefers-color-scheme`) não pôde ser forçada no headless: o CSS existe, mas não foi visto.

## Problemas conhecidos / não verificado

- Reduced motion: o CSS global e o `rootMargin` de `scene.js` foram implementados, mas só a parte CSS foi vista em captura; a troca fora de vista não foi cronometrada no navegador.
- Safari (risco do plano: `translate` com `clamp()` e variáveis) e iOS não foram testados. Sem Lighthouse/Performance panel: LCP, CLS e INP não foram medidos.
- O herói passa um pouco de 100svh em telas baixas (1440×900: 962 px; 1024×768: ~800 px), porque o texto é alto; o plano aceita crescer em vez de sobrepor.
- Fotos de cenário `nyslice` ainda têm a lata de cerveja visível nas janelas desktop ao fundo, sob véu (fora do quadro no herói/tempo/gesto/fogo após o ajuste).
- OG images (`card_html`) seguem na identidade antiga (etapa 12, opcional, não feita).
- Chave i18n `foot.photos` e `player.sub` ficaram sem uso na página.

## Correções pós-auditoria

Medido com Chrome headless via CDP (cache desligado) nos scripts da auditoria. Viewports 375×812, 768×1024, 800×609, 1280×720, 1440×900, claro e escuro; capturas em `design/qa/pos/` (herói, pt e en/new-york).

| Item | O que mudou | Evidência |
|---|---|---|
| P1-1 salto para `#receita` | `.sheet-first{scroll-margin-top:72px}` (≥ 821 px): a folha pousa a 144 px e a faixa de KPIs fica abaixo da topbar | `/pt/#receita` 1440×900: faixa em 80 px, capítulo em 220 px; idem 1366×768 e 1280×720 |
| P1-2 contraste do herói mobile | bloco do texto termina antes de 50% (P1-3) e `.byline small` usa `--scene-ink` | pior pixel do fundo sob o texto: `/pt/` e `/en/new-york/` 375×812 claro, todos os textos do herói ≥ 15 : 1 |
| P1-3 herói mobile | pílula 11 px, lead limitado a 4 linhas, "Próximo" desce para junto do seletor (`order`), paddings menores; NY: `hero.m.s` 1,00 → 0,66 (a foto passa a nascer em 34%) | `hero.mjs`: fim da assinatura em 46% (`/pt/`) e 49% (NY) a 375×812; 45–48% a 390×844; foto em 34% nas 4 páginas |
| P1-4 herói ≤ 100svh | `--t-hero` limitado por `9.6vh`; padding 84/96; coluna de texto 680 px; lead 54ch; "Próximo" e seletor mais próximos | 1440×900 = 900 px, 1366×768 = 768, 1280×720 = 720 (100%) nas 4 páginas; faixa de KPIs visível (top 836/704/656) |
| P1-5 alvos de toque | tema 44×44, idioma ≥ 44×44, `.btn.small`, `.seg` e capítulos do player com 44 px de altura (a barra visual segue com 6 px) | medido: tema 44×44, idioma 63×44 (44×44 no mobile), `.small` 44, capítulos 32×44 (desktop) e 20×44 (mobile; 13 alvos lado a lado não cabem em 44 px de largura, passam do mínimo de 24 px) |
| Imagens (peso) | derivadas passam a ser geradas direto em `docs/img/scene/` (única cópia versionada); `src/photos/scene/` guarda só o `manifest.json`; só AVIF (27 arquivos) e um JPG de fallback por foto/recorte (`d-1280`, `m-800`, q 58); sem WebP | `docs/img/scene` = 4,4 MB (antes 12 + 12 MB); README e `.gitignore` atualizados |
| Reduced motion | com "reduzir movimento" a tomada só troca com nenhuma janela à vista (observador por estado: sai por cima → próxima, sai por baixo → anterior; salto por âncora → anterior) | `rm.mjs` 1440×900 e 375×812, descendo e subindo: todas as trocas com "windows in view: none"; `#sobre`/`#forno` abrem em `fogo` |
| Modo do player | `go(i, true)` passa para Filme (Próxima, Anterior, Repetir, Ver o gesto); "Filme" parado toca; pausar volta a Bancada e ressincroniza com a etapa em foco | `pm.mjs`: Próxima → film/tocando; pausa → bench; Filme parado → film/tocando; pausa depois de rolar → "Etapa 07" |
| Texto do timer | "Faixa laranja/Orange band" → "Faixa dourada/Gold band" (pt/en, as duas receitas) | `/en/` lê "Gold band: 25–30 s…" |
| Faixas no palco do player | `.stagebox` passa de 16/10 para 16/9, igual ao `viewBox` 800×450 do SVG | sem letterbox; o player sticky também fica mais baixo |
| aria-label ± | `panel.fewer`/`panel.more` ("Uma pizza a menos/a mais", "One pizza fewer/more") | `/en/` lê "One pizza fewer"/"One pizza more" |
| Foco dos campos | `.inp:focus-within` com outline de 3 px (foco da cena/folha) | `outline: 3px solid` medido em `#p-flour` |
| Dois `nav` "Receitas" | rodapé: `foot.recipes` = "Mais receitas"/"More recipes" | navs: Sections, Recipes, More recipes, Languages |
| Fontes | `Fraunces` fixa em `opsz 72`, só pesos 560 e itálico 400; Atkinson 400/600; pesos 600 do display viraram 560 | rede: 4 woff2, 122 KB (eram 214 KB; teto 160 KB) |
| Item 4 (800×609, lead ausente) | o lead, a assinatura e o seletor existem e estão visíveis nesse tamanho (lead em 228–293 px, seletor em 483–553 px, opacidade 1). Causa provável da observação: a animação de entrada usava `opacity:0` com `backwards` e atraso; num painel sem quadros de animação (aba em segundo plano) os itens com atraso (lead, assinatura, seletor) ficavam invisíveis, enquanto h1 e "Próximo" (sem animação) apareciam. A entrada agora só desloca (`translate`), sem `opacity` | com todas as animações pausadas em t=0: opacidade 1 em `.recipes`, `.pill`, `.lead`, `.byline`, `.qcard`; layout 800×609 sem corte |
| P2-4 (parte) | pílula "Próximo" reserva o espaço (`visibility:hidden` em vez de `display:none`, `min-height:40px`) | sem salto quando o JS preenche |
| P2-13, P2-15, P2-14 (parte) | `credit_html(..., label)` sem `.replace`; chaves `foot.photos` e `player.sub` removidas; CSS embutido sem comentários/indentação | `build.py` ok; HTML 186 KB |
| P2 sem mudança | P2-7 (OG na identidade antiga) e etapa 12 seguem pendentes; P2-3 (LCP em rede lenta) precisa de medição em produção com gzip; P2-4 (parte do player: altura fixa da legenda) e minificação de JS não feitas | — |

Processos: o Chrome de depuração (porta 9333) foi encerrado; o servidor da porta 8766 já existia e foi mantido.
