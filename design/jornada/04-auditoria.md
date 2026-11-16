# Jornada · 04 · Auditoria independente (E10)

Branch `redesign-imersivo`, árvore de trabalho de 16/11/2026 (nada commitado; remoções da E8 em stage). Auditor independente: nada foi corrigido, só medido. Capturas em `design/jornada/qa/audit/` (ignorado pelo git). Harness próprio: `design/jornada/tools/audit.mjs` (novo), com os roteiros de medição em `design/jornada/tools/audit/` (`node design/jornada/tools/audit.mjs design/jornada/tools/audit/<roteiro>.mjs`).

## Resumo

| Prioridade | Quantidade |
|---|---|
| P0 (bloqueante) | 0 |
| P1 (importante) | 6 |
| P2 (menor) | 18 |

Veredito: a implementação é sólida e fiel ao plano no essencial. O build é reprodutível, o JSON-LD é idêntico à E0, as quantidades estão certas, não há erro de console e a câmera é fluida. A ilustração é coerente entre as cenas e está no nível do protótipo. **Não há bloqueio**, mas há 6 P1 a corrigir antes do merge:
- 2 de etiquetas: colisão no prólogo e corte sob a barra no tablet;
- 1 de contraste: o token `--ember` no claro mede 4,45:1;
- 1 de retomar: nenhum botão primário;
- 1 de celular deitado: âncoras caem com o cartão fora da tela;
- 1 de emenda: a última passagem da New York no tablet.

## Método e limites

- **Navegador e servidor.** Chrome headless (Chrome do sistema) via CDP, com `Emulation.setDeviceMetricsOverride` e `mobile: true` abaixo de 820 px, mais emulação de toque. O servidor Node é próprio, com **gzip** (como o GitHub Pages), 301 em diretório sem barra e `404.html` com status 404. O cache fica desligado (`Network.setCacheDisabled`) e o `localStorage` é limpo a cada navegação.
- **Rede e CPU** (medições de desempenho): latência de 150 ms, 1,47 Mbit/s de descida, 0,69 Mbit/s de subida, CPU 4×. Três repetições por página e viewport.
- **Fontes.** As fontes vêm do Google Fonts real (rede externa). Isso explica um LCP isolado de 4,4 s na primeira medição fria (ver P2-16).
- **Painel de navegador do app.** Não foi usado.
- **Limites.** Headless não mede quadros reais de GPU. A fluidez foi medida por intervalos de `requestAnimationFrame` e `long-animation-frame` durante rolagem por `mouseWheel`, e vale como indicativo.

## Critérios de aceite (02-arquitetura, 6.1)

| # | Critério | Resultado | Evidência |
|---|---|---|---|
| 1 | `build.py` termina em `ok`, sem aviso de orçamento | **Passa** | `python3 build.py` → `ok`. O HTML regenerado é idêntico byte a byte ao de `docs/` (`diff -rq` vazio). `--sizes`: maior ladrilho 2,3 KB e 36 elementos. A injeção de falhas numa cópia confirma que o build reprova `id=` em fragmento, chave sem uso, luz inválida, etiqueta inexistente, 2 `#paint` e orçamento estourado. |
| 2 | Pré-render | **Passa** | O HTML contém `data-k="pfFlour">400<`, `bassWater">18<` e `n">5<`. `<html lang="pt-BR">` está sem classe. Não há `.live` nem `transform` em `.scene`, `data-when` está vazio e `#resume` está `hidden`. `tools/ld.py cmp`: 4/4 OK, objeto inteiro idêntico à linha de base. Não há `<img>` em `.journey` e não há ids duplicados. |
| 3 | URLs e redirecionamentos | **Passa** | As 4 páginas servem 200; `/pt` dá 301 para `/pt/`; uma URL inexistente dá 404 com `404.html`. `git diff HEAD` de `sitemap.xml`, `404.html`, `robots.txt`, `CNAME`, `es/`, `it/` e `zh/` está vazio. Navegação real: `/es/new-york/#s5` → `/en/new-york/#s5`, `/it/#s5` → `/en/#s5` e `/zh/new-york/#s5` → `/en/new-york/#s5`. |
| 4 | Sem rolagem horizontal | **Passa** | Matriz: 4 páginas × 8 viewports (360×640 … 1920×1080, mais 812×375) × claro/escuro × `sda`/`jsd`/estático. `scrollWidth ≤ innerWidth` em todos os casos (ver seção "Matriz"). |
| 5 | Console limpo | **Passa** | A mesma matriz, com a página inteira percorrida, não registra nenhum erro, aviso ou exceção. |
| 6 | Desempenho | **Passa** (meta de CLS não atingida) | LCP 0,41–1,42 s (3 repetições, `/pt/` e `/en/new-york/`, 375 e 1440). CLS: 0,052 no desktop de `/pt/` e 0,011 na NY (abaixo de 0,1; acima da meta de 0,02). Nenhuma tarefa > 200 ms nas repetições. Figuras com `display` ativo: no máximo 3. |
| 7 | Emenda ≤ 1 px e `sda` = `jsd` | **Falha** (1 caso) | Em 1440, 375 e 1024 a sobreposição fica entre 0,87 e 1,13 px nas duas receitas. **Falha em 768×1024 na NY, `s11→s12`**: no motor CSS as figuras divergem até 384 px, contra 1 px no motor JS (P1-6). |
| 8 | Etiquetas: invisíveis na passagem, inteiras e fora do cartão | **Falha** | Nenhuma etiqueta aparece no meio das passagens (capturas `shots/*x-*`), e nenhuma cruza o cartão. Mas **duas etiquetas se sobrepõem no prólogo** em todos os desktops e nas 4 páginas (P1-1), e **etiquetas são cortadas pela barra em 768×1024** (P1-2). Chão vazio ≤ 30 %: passa a olho (bancada ≈ 22 % da altura). |
| 9 | Celular: palco visível, nada o cobre, sem rolagem interna | **Passa** | Medido em 375×812 e 768×1024, napolitana `s2`/`s12` e NY `s1`/`s9`, em repouso e com +200 e +400 px de leitura. O palco fica 100 % na tela e `elementFromPoint` no centro do palco devolve a `figure`. Não há rolagem interna e "Feito" é alcançável: 0 casos com problema. Folhas `sheet-pt-375-*.png`. "Começar" fica inteiro em 375×812. |
| 10 | Contraste (etiquetas ≥ 7:1; interface ≥ 4,5:1) | **Falha** (marginal) | Foram 8 036 medições (4 páginas × 2 temas × 2 viewports, todos os ladrilhos, epílogo e diálogo). Etiquetas: mínimo de 8,9:1. O texto da barra e do trilho sobre a cena, por amostragem de pixels, tem pior caso de 6,44:1. **O texto `--ember` no claro mede 4,45:1** (P1-3). |
| 11 | Quantidades | **Passa** | 400/400/0,8; 23 g em 94 g; 18 g; 5 × 270 g; 1.348 g (capturas e DOM). Hidratação 70 % → 560 g de água ao vivo, e "restaurar" volta a 512. |
| 12 | Ferramentas | **Passa** (ressalvas P2) | Tudo testado por clique real:<br>• Ajustes com todos os ids; `p-sugar` só na NY e `p-pf`/`p-pfh` só na napolitana. Restaurar funciona.<br>• Abertura em modo pizzas com "+" até 7: farinha 1.122 g, 7 panetti em cada uma das 3 bandejas, etiqueta e barra atualizadas.<br>• Diagnóstico "Fundo queima antes do topo" → aplicar: `p-bottom` 370 e etiqueta do forno 370.<br>• "Feito" em `s2` sobrevive ao recarregar, com cartão `.is-done`, ponto do trilho e 1/13.<br>• "Começar" leva a `#s1` na posição de repouso.<br>• Agenda: `#timeline` com 7 eventos, aviso de "começo no passado", selo "agora" no cartão e no trilho.<br>• Timer da NY: faixas de 60–90 s e 300–420 s, anel `1.502/480`, mini-timer `⏱ 0:02` fora de vista.<br>• Retomar.<br>• Cartão "New York" da abertura leva 6 pizzas (`newyork-v1:p = {mode:pizza, pizzas:6}`).<br>• Tema grava `np-theme` com `until` 5,9 h à frente; idioma grava `np-lang`.<br>Ressalvas: P2-7 (o rodapé não leva o nº de pizzas) e P2-18. |
| 13 | Movimento reduzido | **Passa** | Emulado: `getAnimations().length = 0` e nenhuma `.scene` fixa. Interruptor: grava `np-ui` e recarrega em modo estático. Com `reduce` no sistema, o interruptor fica desmarcado e desabilitado, com a nota visível. |
| 14 | Teclado | **Passa** (ressalva P2) | Tab ponta a ponta (1440 e 375, as duas receitas), sem armadilha e com contorno sempre visível. O diálogo prende o foco, fecha com Esc e com clique no fundo, e devolve o foco a `#openAdj`. Enter num campo numérico **não** fecha o diálogo. Ressalva: em 375, um chip do diagnóstico recebe foco sob a doca (P2-5). |
| 15 | Sem vão entre ladrilhos | **Passa** | Matriz completa: 0 vãos. |
| 16 | Sem scroll-jacking | **Passa** | Não há `preventDefault` em `wheel`, `touch` ou teclas (só em submit e links internos). Não há `scroll-snap`. `scrollIntoView` só ocorre em clique. Rolagem por roda medida, sem retenção. |
| 17 | 1024×768 e 812×375 | **Falha** (812×375) | 1024×768: nenhuma etiqueta sob o cartão. A caixa segura passa 17 px por baixo dos cartões largos da abertura e do prólogo (P2-11). **812×375: âncoras caem com o cartão fora da tela e uma faixa de grão cobre o conteúdo** (P1-5). |

Placar: 13 passam (3 com ressalva) e 4 falham (7, 8, 10, 17).

## Não conformidades

### P0
Nenhuma. As quantidades estão certas, não há erro de console, as URLs e o pré-render estão íntegros, e não há armadilha de teclado.

### P1

**P1-1 · Etiquetas sobrepostas no prólogo (mise), em todos os desktops e nas 4 páginas.**
- Evidência:
  - "512 g água" é coberta por "12 g azeite", com interseção de 52×14 px em 1440×900, 67×19 em 1280×720, 63×17 em 1024×768 e 37×9 em 1920×1080.
  - Na NY é igual ("334 g água" × "13 g azeite"), e também em `/en/`.
  - No celular a sobreposição é de 3 px ("800 g farinha" × "512 g água").
  - Capturas: `shots/_pt_1440x900-light-01-mise.png` e `shots/_pt_new-york_1440x900-light-01-mise.png`.
- Correção: reposicionar `at` de `water` e `oil` em `src/recipes/*/recipe.json › journey.mise.tags` (por exemplo, a água acima da jarra, x ≈ 740, e o azeite acima da garrafa, x ≈ 980, y ≈ 360). Acrescentar ao QA uma verificação de colisão etiqueta × etiqueta.

**P1-2 · Etiquetas cortadas pela barra em 768×1024 (tablet retrato).**
- Evidência:
  - `s1` "400 g farinha" (pt, en e NY) e `s2` "23 g sal" (pt e en) têm topo em y = 43 px, sob a barra (52 px), e ficam fora do palco.
  - Captura: `shots2/_pt_768x1024-light-02-s1.png`.
- Causa:
  - Em 768 px vale o bloco mobile: palco de 360 px e `--u` ≈ 0,766.
  - A área visível começa em y ≈ 185,6 da arte (no 375×812, em 159,6).
  - As etiquetas de `s1` e `s2` estão em `at: [806, 176]` (`recipe.json › journey.steps`), acima do topo da caixa segura (y 190), contra a regra 3 de 1.2: "o assunto e todas as âncoras de etiqueta precisam caber nela".
- Correção:
  - Descer essas âncoras para y ≥ 190, ou dar `m` dentro da caixa.
  - Acrescentar no `validate_journey` um assert `190 ≤ y ≤ 630` para `at` e `m`.
  - Incluir 768×1024 no teste de etiquetas.

**P1-3 · Contraste do token `--ember` no tema claro: 4,45:1 (abaixo de 4,5:1).**
- Evidência:
  - `#A85A0C` sobre `--paper #F7EFE1` dá 4,45:1, e sobre `--paper-2` dá 4,01:1.
  - Elementos afetados:
    - `.eyebrow .when` (14 px, negrito, texto normal pela WCAG): 112 medições abaixo do mínimo, em todos os cartões das 4 páginas (pt e en);
    - o selo `.now` (texto `--paper` sobre `--ember`, 13 px): 4,45:1;
    - `.tl .when b` no diálogo;
    - `.mini` na barra.
  - O tema escuro passa (8,47:1).
- Correção: escurecer `--ember` do claro para `#9A5209` em `src/style.css:8`. Calculado: 5,13:1 sobre `--paper` e 4,62:1 sobre `--paper-2`.

**P1-4 · Retomar sem ação principal: "Continuar na etapa NN" aparece como botão fantasma.**
- Evidência:
  - Com `napolitana-v1:last` gravado, `#resume` (classe `btn`) e `#go` (classe `btn ghost`) têm os dois `background: transparent` e borda `--line`.
  - Capturas: `resume-1440.png` e `resume-375.png`.
  - Causa: o seletor `.btn:not(.primary):not([type=submit])` em `src/style.css:205` pega o `<a class="btn" id="resume">`.
  - O plano (4.3) e a estratégia ("ação principal") pedem que "Continuar" seja o primário.
- Correção: em `journey.js:138`, acrescentar `a.classList.add('primary')`. Ou trocar o seletor fantasma por `.btn.ghost` apenas.

**P1-5 · Celular deitado (812×375): âncoras caem com o cartão fora da tela.** Há também uma faixa de grão sobre o conteúdo, que é secundária.
- Evidência:
  - Abrir `/pt/#s8` deixa o topo do ladrilho em 283 px e o cartão em 521 px, **fora da tela** (altura 375).
  - "Próxima" em `s2` leva o ladrilho de `s4` a 252 px, com "Feito" em 807 px.
  - Medido: `scroll-padding-top: 252px` (barra + palco do bloco mobile), com a barra em `position: absolute`.
  - Problema secundário: uma faixa de textura de grão a 12 % (`.grain`, z 6, top 52, altura 200) fica por cima do conteúdo e aparece como um véu acinzentado sobre o cartão.
  - Capturas: `land-812x375-s8.png` e `next-812x375-s4.png`.
- Causa:
  - 812 ≤ 820, então o bloco mobile (`style.css:387-427`) também vale.
  - O bloco de paisagem baixa (`style.css:431-443`) não desfaz `html.mo{scroll-padding-top}` (`:406`) nem `html.mo .grain` (`:405`).
- Correção: no bloco `(max-height:520px) and (orientation:landscape)`, acrescentar `html.mo{scroll-padding-top:0}` e `html.mo .grain{display:none}`, e zerar `--dock`.

**P1-6 · Última passagem da New York no tablet (768×1024, motor CSS): a cena `s12` chega antes da hora e encobre `s11`.**
- Evidência:
  - Diferença entre as bordas no meio da passagem `s11→s12`: 384 px em `sda`, contra 1 px em `jsd`, e 78 e 245 px a 30 % e 70 %.
  - Captura: `ny-768-s11-s12-0.5.png`. A cena final já está parada enquanto o cartão anterior ainda sai.
- Causa:
  - O ladrilho `.last` mede 364 px, menos que a área útil (556 px).
  - Com isso, a fase `entry` dele (`travel-last`) dura menos que a `exit` de `s11`.
  - Isso viola o requisito do plano (2.3): ladrilho ≥ área útil + cartão no mobile.
  - A napolitana escapa porque o cartão do timer é alto.
- Correção: `html.mo .tile.last{min-height:calc(100svh - var(--in-top) - var(--in-bot) + 1px)}` no bloco mobile, ou o mesmo `padding-bottom` dos outros ladrilhos. Incluir 768×1024 no `seam`.

### P2

1. **CLS no desktop de 0,052 em `/pt/`** (o implementador citou 0,03; a meta é ≤ 0,02).
   - Causa: o deslocamento vem do cartão `#ask`. A abertura é `display: flex; align-items: center` (`style.css:169`). Quando `#nextEv` aparece e a fonte troca, o cartão inteiro sobe 60 px (fontes de deslocamento: `FORM#ask 59→56 h841→844`; `FIELDSET 492→432`; `A#nextEv 790→730`).
   - Correção: `align-items: flex-start` com padding fixo, ou reservar a altura de `#nextEv` (`min-height`), e fazer preload do Fraunces.
2. **Janela de leitura vazia no celular durante a passagem.**
   - O `padding-bottom` do ladrilho é a área útil inteira (`style.css:399`); o plano dizia 30vh.
   - É um desvio do plano que não foi registrado em `03-implementacao.md`. Capturas: `sheet-pt-375-light.png`, quadros `…x-…`.
   - É cosmético e aceitável pela geometria, mas registrar ou reduzir para que a passagem ocupe só uma parte.
3. **Sem JS a abertura e as ferramentas parecem quebradas.**
   - O campo de quantidade fica vazio, só com "g" (`#qty` sem `value`). `#qLbl` fica vazio, e o campo fica sem nome acessível.
   - `#sum` e o rótulo da doca ficam vazios.
   - "Começar" recarrega a página.
   - Timer, chips do diagnóstico e "ajustar" aparecem, mas não fazem nada.
   - A bandeja dos panetti e os potes da NY ficam vazios (problema já conhecido).
   - Capturas: `nojs-375-top.png` e `nojs-375-s8.png`.
   - Correção: o pré-render preenche `qty`, `qLbl` e `sum`; esconder os controles só-JS com `html:not(.js) …{display:none}`; desenhar os panetti padrão (5) no build.
4. **Abrir com âncora no celular nem sempre alinha o cartão à janela de leitura.** Em `/pt/#s8` (375×812) o topo do cartão ficou em 336 px numa execução e em 466 px em outra, contra 377 esperado. A sobrelinha com o horário fica sob o palco (`land-375-s8.png`). O clique em "Continuar" alinha certo (376,8). Correção: depois de `document.fonts.ready` e de `fit()`, refazer `scrollIntoView` se `location.hash` apontar para um ladrilho.
5. **Foco sob a doca** em 375: um chip do diagnóstico ("Tudo pálido" e "Borda dura…") recebe foco com y = 768 e fica coberto pela doca (WCAG 2.4.11). Correção: `html{scroll-padding-bottom: var(--dock)}` no mobile.
6. **Rótulo acessível diferente do texto visível (WCAG 2.5.3).**
   - `#openAdj`: o `aria-label` é "Ajustar a massa e os parâmetros", e o texto visível é "800 g · 5 pizzas ajustar".
   - `#dlbl`: o `aria-label` é "Todas as etapas", e o texto visível é "7/13 · …".
   - Correção: rótulo que comece pelo texto visível, ou `aria-describedby`.
7. **Troca de receita fora da abertura.**
   - O diálogo Ajustes não tem a seção de receita (estratégia 3: "a primeira seção dos ajustes é a própria pergunta de abertura").
   - Os links de receita do rodapé não têm `data-recipe`/`data-ls`, então não levam o nº de pizzas (plano 4.2).
8. **"un" fixo no código** (`journey.js:119`): `/en/` em modo pizzas mostra "un". Correção: levar a unidade para o i18n.
9. **O build não valida paridade pt/en** (plano 3.4 item 5), embora o README diga que sim.
   - Teste: acrescentar `js.zzz` só no pt e remover a `tip` da etapa 1 no `en` deixa o build em `ok`.
   - Correção: comparação recursiva das chaves de `i18n/*.json` e `recipes/*/<l>.json`.
10. **Etiquetas soltas no ar e sem barbante.**
    - Nas cenas de gesto e de bandeja (`s5`, `s7`, `s8`, `s9`, `s10`, desktop), as etiquetas ficam na parede, longe do objeto: "1 h" a cerca de 400 px da ampulheta, "5 × 270 g" a cerca de 300 px dos panetti.
    - A estratégia pedia etiqueta "presa ao objeto, papel pardo 2 tons, furo e barbante".
    - Correção: aproximar `at` dos objetos e acrescentar um fio ou alfinete em CSS (`::before`).
11. **Caixa segura sob os cartões largos** da abertura e do prólogo: 17 px em 1024×768 e 36 px em 1280×720 (cartões de 440 e 520 px). Em 1024×768, as etiquetas do prólogo ("0,8 g fermento" e "8,0 g açúcar") ficam sob o trilho. A balança da abertura some parcialmente atrás do cartão.
12. **Cenas de gesto mais esquemáticas** (problema conhecido). `s5`, `s7` e `s12`/`s9` NY são uma massa-bolha e uma elipse com pontilhado. O nível é inferior a forno, bancada e geladeira, mas coerente. Rodada de refinamento opcional.
13. **Artefato:** um retângulo cinza aparece à direita do cartão em y ≈ 275 (`s1` e `s7`, 1440). É uma ponta de prateleira cortada pela borda do cartão.
14. **Manutenção do `build.py`:**
    - variáveis mortas em `build_journey` (`cur_li`, `figs`, `last`);
    - `nxt_link` calculado duas vezes;
    - atributo `data-open-adj` gerado mas não usado pelo JS;
    - `buildLD()` chamada depois de timer, diagnóstico e tema (`app.js:231`), contra o plano (antes). Sem efeito hoje, porque o JSON-LD já vem do pré-render.
15. **Alvos de 43 px** nos links do menu de idioma (`.lang li a`, 148×43). A meta é ≥ 44.
16. **LCP frio isolado de 4,4 s** em `/pt/` 375 na primeira medição, depois 0,43–0,94 s.
    - A causa provável é a resolução do Google Fonts sem cache.
    - Nessa primeira execução houve também **dois** quadros longos de cerca de 233 ms (LoAF 235 e 237 ms) durante a rolagem, ambos em `/pt/` (um em 375, outro em 1440), nenhum na NY.
    - Os quadros longos não se repetiram em 3 repetições.
    - Vale testar em aparelho real e considerar fontes auto-hospedadas.
17. **Texto de posição e retomar** sem zero à esquerda: "Continuar na etapa 7", "etapa 7 de 13". A estratégia usa "07". É cosmético.
18. **Timer no celular com o relógio grande.**
    - A estratégia 6 (Timer) diz: "No celular o bloco do timer vem logo abaixo do título e sem o relógio grande (o tempo é lido no anel da cena e no mini-timer da barra), para os botões ficarem à vista junto com o forno".
    - Em 375×812 o cartão de `s14` mostra o relógio "0 s" de 44 px, e Iniciar/Zerar ficam rentes à doca, só parcialmente à vista na posição de repouso (`shots/_pt_375x812-light-16-s14.png`).
    - Correção: `@media (max-width:820px){.timer .clock{display:none}}`. O anel na cena já mostra o tempo.

## Problemas conhecidos do implementador: classificação

| Item | Confirmado? | Classe |
|---|---|---|
| CLS no desktop de 0,03 | Sim, e pior: 0,052 em `/pt/` 1440 (0,011 na NY) | P2-1 |
| Janela de leitura vazia entre cartões no celular | Sim | P2-2 |
| Sem JS: bandeja de panetti e potes da NY vazios | Sim, e há mais: abertura vazia e controles inertes | P2-3 |
| Cenas de gesto mais esquemáticas | Sim | P2-12 |
| "Geladeira · Geladeira · noite" na doca (`qa/impl/e9/frio1-375x812-dark.png`) | **Não se reproduz** no build atual: a doca mostra "Geladeira · noite / Dia 1 · noite" e `data-title="Geladeira · noite"`. A captura E9 é anterior à última regeneração de `docs/` (00:17 contra 00:19). | resolvido |

## As 3 falhas do protótipo

1. **Etiquetas cortadas e chão vazio.**
   - Corrigido no desktop e no celular: etiquetas em HTML, que somem na passagem, e frente do balcão fechando o quadro.
   - Restam duas regressões: a colisão no prólogo (P1-1) e o corte no tablet (P1-2).
2. **Cartão cobrindo a cena no celular.** Corrigido: o palco fica fixo acima do cartão em todas as capturas de 375 e 768.
3. **Contraste das etiquetas no escuro.** Corrigido: mínimo de 8,9:1.

## Qualidade visual e jornada

- **Pontos fortes:**
  - A continuidade é convincente. A bancada fica na mesma altura e a parede muda de cor sem emenda: as variáveis `--wl` dos 17 ladrilhos conferem com o momento anterior, verificado no HTML.
  - A luz conta o dia: noite com luminária, manhã fria, tarde dourada, brasa.
  - Tigela, pote, forno e janela se repetem e criam o "mesmo lugar".
  - O escuro é a mesma cena à noite, e as etiquetas continuam legíveis.
  - O nível de pintura de `s1`, `s2`, `s4` e `s14` está no do protótipo (comparado com `qa/d-light-03-s1.png`), com menos adereços de contexto à esquerda, que ficam escondidos pelo cartão no desktop.
- **Pontos fracos:**
  - Etiquetas soltas no ar (P2-10).
  - Repetição de adereços: janela, planta e pote estão em quase todo ladrilho.
  - Massas de gesto esquemáticas (P2-12).
  - No tablet o palco é uma faixa baixa e corta a luminária e as etiquetas (P1-2).
  - O celular mostra a cena inteira, mas a janela de leitura fica vazia na passagem (P2-2).
- **Folhas de contato:**
  - `sheet-pt-1440-light.png`;
  - `sheet-pt-375-light.png` e `sheet-pt-375-dark.png`;
  - `sheet-ny-1440-light.png` e `sheet-ny-375-dark.png`;
  - `sheet-pt-768.png`.

## Matriz de console, rolagem horizontal e vãos

Resultado da matriz: **160 configurações, 0 falhas**.
- Configurações: 4 páginas × 8 viewports (360×640, 375×812, 812×375, 768×1024, 1024×768, 1280×720, 1440×900, 1920×1080) × {claro `sda`, claro `jsd`, claro estático, escuro `sda`, escuro estático}.
- Em cada configuração a página inteira foi percorrida.
- Resultado: nenhum erro, aviso ou exceção no console; `scrollWidth = innerWidth` em todas; nenhum vão entre ladrilhos.
- As 20 linhas de 812×375 também ficaram limpas (`812 812 0 0`). A falha desse viewport é de âncora (P1-5), não de rolagem horizontal.

## O que foi testado

- Build, reprodutibilidade, `--sizes` e injeção de falhas nas validações (cópia no scratchpad).
- JSON-LD contra a linha de base, asserts de pré-render e legado removido (`grep` sem resultado; `docs/` com 6,8 MB).
- Peso: HTML gzip de 45,3 KB (pt) e 43,4 KB (NY). Transferência total no primeiro acesso: 167–169 KB.
- Capturas de todos os ladrilhos e passagens:
  - `/pt/` e `/pt/new-york/` em 1440×900 e 375×812, claro e escuro;
  - `/pt/` em 768×1024, 1024×768, 1280×720 e 1920×1080.
- Etiquetas: colisão, barra, trilho, cartão, palco e caixa segura, nas 4 páginas × 6 viewports.
- Emenda bruta em 4 viewports × 2 motores × 2 receitas.
- Contraste: 8 036 medições, mais amostragem de pixels da barra e do trilho sobre as cenas.
- Funcional: 7 pizzas, diagnóstico aplicado, "Feito" depois de recarregar, "Começar", tema e idioma, troca de receita (abertura e rodapé), 404, 301 e redirecionamentos es/it/zh com hash, retomar, âncoras (1440, 375 e 812×375), diálogo (Esc, fundo, foco, Tab, Enter), hidratação ao vivo, restaurar, agenda, interruptor de movimento, movimento reduzido, sem JS, timer e mini-timer da NY.
- Árvore de acessibilidade (nomes e títulos), alvos, Tab ponta a ponta.
- LCP, CLS com fontes de deslocamento, tarefas longas, LoAF, INP (máximo de 80 ms em 375 com CPU 4×) e quadros durante rolagem por roda.

## O que não foi testado

- Safari, iOS e Firefox, inclusive o motor `jsd` fora do Chrome, `#paint` no WebKit e a barra de URL dinâmica.
- Aparelho real, GPU real e Android intermediário.
- Leitor de tela real (só a árvore de acessibilidade).
- Lighthouse.
- Wake Lock: não há tela para verificar no headless.
- Timer com a aba realmente em segundo plano: só revisão de código, que usa `performance.now()` acumulado.
- Toque real e rolagem por gesto: só emulação de toque e roda.
