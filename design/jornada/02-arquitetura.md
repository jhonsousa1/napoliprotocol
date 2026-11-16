# Jornada · 02 · Arquitetura técnica: "Piano Sequenza" no site

Branch `redesign-imersivo`, ponto de partida no commit 1f832ec ("Luce di Forno"). Este documento é o plano que o engenheiro executa, e ele não terá outro contexto. Leia-o inteiro antes da etapa E0. O que não estiver aqui segue `01-estrategia.md`. Se os dois discordarem, **vale este documento**.

Referências: protótipo aprovado em `design/jornada/prototipo/index.html`. Para abri-lo, rode `python3 -m http.server 8768` na raiz e acesse `http://localhost:8768/design/jornada/prototipo/`. Ele aceita os parâmetros `?theme=dark`, `?motion=off`, `?driver=js` e `?t=85`. Capturas do protótipo: `design/jornada/qa/` (ignorado pelo git).

---

## 0. Decisões em uma página

| Tema | Decisão |
|---|---|
| Mecânica | Travelling lateral por **ladrilhos** (`.tile`). Cada etapa tem uma figura `position: fixed` deslocada por `view-timeline` CSS, atrás de `@supports`. Sem suporte, um fallback JS com a mesma matemática. A passagem ocupa só o miolo da entrada e da saída (25 % → 75 %), para a cena ficar parada a maior parte do tempo. |
| Ilustração | **9 composições** SVG pintadas à mão (`src/scenes/*.svg`) com **estados**, mais uma composição provisória. Não há 17 desenhos independentes. Defs, paleta e filtros são compartilhados. Parede e bancada são CSS, e a luz é definida por etapa em `recipe.json`. |
| Etiquetas de quantidade | Saem do SVG e passam a ser **HTML posicionado em coordenadas da arte**, numa camada própria que não sofre o escurecimento. Aparecem só com a cena parada (opacidade ligada à mesma timeline). Contraste ≥ 7:1 nos dois temas. Isso resolve os problemas 1 e 3. |
| Mobile (retrato, ≤ 820 px ou proporção ≤ 4/5) | **Palco fixo no topo** (cerca de 40 % da altura), sempre acima dos cartões. O cartão rola **por baixo** do palco, numa "janela de leitura" entre o palco e a barra inferior. A cena nunca fica coberta. Isso resolve o problema 2. |
| Marcação | O `build.py` gera **estaticamente** toda a jornada: cartões, texto, cenas e etiquetas, com `<span data-k>` vazios. O JS só preenche números e estado. O pré-render continua preenchendo os números e o JSON-LD. |
| Semântica | Abertura e prólogo são `<section class="tile">`. As etapas ficam numa única `<ol class="journey">`, com um `<li>` por etapa contendo `<article class="tile step">`. O interlúdio da geladeira é um `<aside class="tile cold">` dentro do `<li>` da etapa anterior. O epílogo é uma `<section>` comum. |
| Ferramentas | Abertura: receita, quantidade e "Começar"/"Continuar". `<dialog>` "Ajustes": todos os parâmetros, agenda, preferências. Timer na cena 13. Diagnóstico, regras, glossário e Sobre no epílogo. "Feito" e progresso em cada cartão e no trilho. |
| Sai do site | Cenário fotográfico (`.scene` com fotos, `src/scene.js`, `--scene`, `docs/img/scene/` com 4,4 MB, manifest), player GSAP (`player.js`, `player-stage.svg`, GSAP via CDN), `illustrations.js`, as "janelas" e o herói fotográfico, as fotos dentro das etapas. |
| Adiado | "Ver o gesto" (coreografias), glossário sublinhado no texto das etapas, imagens OG ilustradas, Wake Lock durante a sessão inteira (fica só no timer), índice em folha completo no mobile (fica uma lista simples). |
| Contagem | Napolitana: abertura, prólogo, **13 etapas**, 2 interlúdios e epílogo, ou seja, 17 ladrilhos. New York: abertura, prólogo, **12 etapas**, 1 interlúdio e epílogo, ou seja, 15 ladrilhos. |

---

## 1. Viabilidade: o que entra, o que é adiado

### 1.1 Avaliação crítica do custo das cenas
O protótipo pintou 5 cenas e uma abertura, cada uma com cerca de 40 a 70 nós, mas sempre "do zero". Fazer 17 assim custaria entre 35 e 70 h e produziria deriva visual entre as cenas: tigelas com ângulos diferentes, luz vindo de lados diferentes. Por isso a unidade de produção deixa de ser "a cena da etapa" e passa a ser a **composição**: um enquadramento da bancada com os objetos fixos. A etapa escolhe uma composição, um estado (os blocos que entram) e uma luz (a cor da parede e da bancada, e o escurecimento).

| Composição (`src/scenes/<id>.svg`) | Estados | Usada em (napolitana / New York) | Esforço |
|---|---|---|---|
| `bench`: bancada com saco de farinha, jarra e balança; prateleira e janela ao fundo | `open`, `mise` (5 a 6 potes pesados; `pf` e `sugar` como blocos opcionais) | abertura e prólogo das duas receitas | médio |
| `jar`: pote de vidro, colher, saquinho de fermento, luminária, quina da geladeira | `pref` | N s1 | baixo (protótipo pronto) |
| `fridge`: interior da geladeira, prateleiras e relógio | `jar`, `tray`, `pots` | N frio1, N frio2, NY frio | médio |
| `bowl`: a mesma tigela de cerâmica | `mix`, `bass`, `oil`, `rest` | N s2, s4, s6 / NY s1, s2, s4 | médio (protótipo com 2 estados) |
| `slab`: massa sobre a bancada enfarinhada, giz | `fold`, `lam`, `knead`, `open` | N s5, s7, s12 / NY s3, s9 | alto (4 formas de massa) |
| `tray`: bandeja de madeira, espátula, balança | `balls`, `temper`, `pots`, `pots-temper` | N s8, s9 / NY s5, s6 | médio (panetti desenhados por JS) |
| `sauce`: lata, tigela de tomate, queijo, manjericão | `napo`, `ny` | N s10 / NY s7 | médio |
| `oven`: o mesmo forno BIG HORN | `preheat`, `build` (pizza na pá diante do forno), `bake` (boca do forno, anel do timer) | N s11, s13, s14 / NY s8, s10, s11 | alto (protótipo com `bake`) |
| `slice`: pizza na grade, cortador, fatia dobrada | `ny` | NY s12 | médio |
| `pending` (provisória): só prateleira e janela | — | qualquer etapa ainda não pintada | trivial |

São 9 composições e 22 estados. Estimativa: 25 a 35 h de desenho, ou seja, a metade. A continuidade vem de graça, porque a tigela da mistura **é** a tigela da bassinage.

**Entra nesta implementação:** tudo da tabela; abertura com receita e quantidade; prólogo com a tabela da receita; os 2 interlúdios (1 na NY); cartões com quantidades, horário do cronograma e selo "agora"; "Feito", progresso, trilho (desktop) e barra inferior (mobile); retomar; o `<dialog>` Ajustes completo; timer com anel na cena e mini-timer na barra; diagnóstico com "aplicar"; regras, glossário, Sobre e galeria de fotos reais com créditos; claro/escuro; movimento reduzido; pt e en para as duas receitas.

**Adiado (registrar em `README.md › Pendências`):**
1. "Ver o gesto". As coreografias do `player.js` são GSAP num estilo plano ("tag cards" do Codex), incoerente com a pintura. Refazê-las como animação dos próprios estados custa mais uma rodada inteira.
2. Termos do glossário sublinhados no texto das etapas.
3. Imagens OG e de receita (`--images`) redesenhadas com a ilustração. As atuais continuam válidas.
4. Wake Lock "durante a sessão de trabalho". Fica só no timer.
5. Índice em folha com busca no mobile. Fica uma lista simples num `<dialog>`.
6. Desligar `#paint` por aparelho (`deviceMemory`). Só se a medição pedir (ver 2.4).

### 1.2 Sistema de cena

**Arquivos**
- `src/scenes/defs.svg` é o único arquivo de definições, inserido uma vez por página num `<svg width="0" height="0" aria-hidden="true" style="position:absolute">`. Ele contém:
  - gradientes de material, partindo dos do protótipo: `gDough gPaste gCer gCerIn gGlass gWater gKraft gWood gSack gSteel gFridge gCon gLamp gCone gCold gEmber gHalo gCrust gTom gSkyV`;
  - os filtros `#paint` (bordas irregulares e grão, estático) e `#soft` (`feGaussianBlur` 7, só para o primeiro plano e para manchas de luz);
  - os `<symbol>`: `win` (janela), `shelf`, `lamp`, `bowlB` e `bowlF` (fundo e frente da tigela, para a massa ficar "dentro"), `jar`, `jug`, `sack`, `scale`, `tray`, `pot` (pote individual), `oven`, `peel`, `can`, `fridgeCorner`, `clock`, `cloth` (pano de linho do primeiro plano).
- `src/scenes/<composição>.svg` é um **fragmento**, sem `<svg>` raiz. Ele é dividido em camadas por comentários-marcadores, nesta ordem:
  ```
  <!--@far-->   janela, prateleira, luminária (parallax lento)
  <!--@sub-->   assunto + sombras de contato (recebe o escurecimento do tema)
  <!--@fx-->    fontes de luz e animações em loop (NÃO escurece)
  <!--@near-->  primeiro plano desfocado (parallax rápido; recebe o escurecimento)
  ```
- Blocos condicionais **não aninhados**: `<!--if:mix bass-->…<!--/if-->` entra se algum dos tokens ativos estiver na lista, e `<!--if:!ny-->` entra se o token não estiver ativo. Os tokens ativos de um ladrilho são o estado, o id da receita (`napolitana` ou `new-york`) e as flags `pf`, `sugar` e `wsplit` de `features`. O build remove os blocos inativos **antes** de inserir, para não pesar o HTML.
- Desenho dinâmico: só por ganchos vazios `<g data-draw="balls"></g>`, `<g data-draw="ring"></g>` e `<g data-draw="pie"></g>`, preenchidos pelo `journey.js`.

**Regras de composição** (o build verifica o que dá para verificar):
1. Quadro de 1600×900. **Linha da bancada em y = 600**. Parede e bancada **não** são desenhadas no SVG; são o fundo CSS do ladrilho.
2. Luz sempre do alto à direita. Cada objeto tem sombra própria, com gradiente radial de 3 a 4 paradas, e sombra de contato `gCon` na bancada.
3. **Caixa segura do assunto: x 650–1210, y 190–630.** O assunto e todas as âncoras de etiqueta precisam caber nela, porque é o que o celular mostra. Fora dela só entra contexto (prateleira, janela, geladeira, adereços laterais).
4. **Nada de chão vazio.** Toda composição tem pelo menos um adereço no primeiro plano (`near`, y 680–900: pano, saco, tábua, pá, farinha espalhada) e pelo menos um adereço de contexto em **cada** metade lateral (x < 600 e x > 1260), entre y 380 e 620. É o que aparece no meio da passagem.
5. Até 5 cores locais e 2 de luz por composição. Sem contorno preto, sem ícone plano. Sem `<text>` com palavras, porque palavras vêm do i18n nas etiquetas HTML. O `<text>` só é admitido para "00" no saco e números genéricos.
6. **Sem `id=`** nos fragmentos (ids só em `defs.svg`). Até **1** `filter="url(#paint)"` por estado, no grupo do assunto. Nenhum filtro em elemento animado. Animação só com as classes do catálogo (`.bub .wisp .pour .drop .pulse .breathe`), em `transform`/`opacity`, e só dentro de `@fx`.
7. Orçamento por ladrilho, já sem os blocos inativos: **≤ 14 KB e ≤ 260 elementos**. Página inteira: ≤ 240 KB de SVG inline. O build mede, e passar disso é **erro** (ver 3.4).

**Luz (momentos).** São tokens CSS por momento. O ladrilho recebe a classe `l-<momento>`, que define o lado direito (`--wr --br --sky* --dim*`), e o build injeta o lado esquerdo a partir do momento do ladrilho anterior (`style="--wl:var(--w-<ant>);--bl:var(--b-<ant>)"`). Assim a emenda é garantida por construção. Valores (claro / escuro):

| momento | parede | bancada | céu da janela | `--dim` (objetos) |
|---|---|---|---|---|
| `dusk` fim de tarde | `#E2C39B` / `#4B3828` | `#B98556` / `#4E3423` | `#F6CF95` / `#A7714A` | .98 / .60 |
| `eve` anoitecer | `#B88865` / `#35271F` | `#9A6A45` / `#3C281C` | `#C9906A` / `#5A3E33` | .90 / .58 |
| `night` noite | `#4A3A3C` / `#17121A` | `#5C3E2C` / `#231712` | `#273352` / `#161C30` | .80 / .56 |
| `morning` manhã | `#EADFC8` / `#4F463C` | `#C99A66` / `#57402C` | `#CFE4EF` / `#6B8CA3` | .96 / .62 |
| `noon` meio-dia | `#E8D3AE` / `#52463A` | `#C4915C` / `#553D29` | `#BFDDF0` / `#7393A9` | 1 / .64 |
| `golden` tarde dourada | `#DDB07A` / `#4D3824` | `#B67F49` / `#4F3521` | `#F7D595` / `#B4844E` | .98 / .62 |
| `ember` brasa | `#34201A` / `#150C09` | `#4A2C1E` / `#1F130D` | `#3A2F52` / `#1B1730` | .82 / .60 |
| `cold` geladeira | `#B9D2DC` / `#1E3340` | `#8FAFBD` / `#18272F` | `#DDEFF6` / `#2A4656` | .95 / .60 |

---

## 2. Mecânica, desempenho e movimento reduzido

### 2.1 Modos (classes em `<html>`, postas pelo script do `<head>` antes da pintura)
- `js` indica que há JS. `mo` indica movimento ligado: não há `prefers-reduced-motion: reduce` e `np-ui.motion` não é `false`. `sda` indica que `CSS.supports('animation-timeline: view()')` é verdadeiro; caso contrário entra `jsd`.
- Ganchos de QA: `?np-motion=off` força o modo estático e `?np-driver=js` força `jsd`.
- **Sob `?prerender` o script não adiciona nenhuma classe.** Ele aplica só o tema, que o `prerender()` já remove.
- Sem `mo` (reduzido, sem JS, pré-render) a página é o **modo estático**: cada figura é `position: relative` em cima do seu cartão, com altura `min(56vw, 46vh)` no desktop e `var(--stage)` no mobile, sem animação, com todas as etiquetas visíveis.

### 2.2 Geometria da câmera (CSS puro, por variáveis)
Cada `.scene` (a `<figure>` do ladrilho) define a câmera a partir da altura do palco `--st-h`:

```css
.scene{
  /* desktop: cobre a tela com recorte de baixo (bancada menor), horizonte a 70 %, assunto a 62 % */
  --u: max(calc(100vw / 1600), calc(var(--st-h) / 820));
  --cx:930; --cy:600; --px:.62; --py:.70;
  --W: calc(var(--u) * 1600); --H: calc(var(--u) * 900);
  --ax: clamp(calc(100vw - var(--W)), calc(100vw * var(--px) - var(--u) * var(--cx)), 0px);
  --ay: clamp(calc(var(--st-h) - var(--H)), calc(var(--st-h) * var(--py) - var(--u) * var(--cy)), 0px);
  --hz: calc(var(--ay) + var(--u) * 600);            /* linha da bancada, para o fundo CSS */
}
@media (max-width:820px),(max-aspect-ratio:4/5){
  .scene{ /* mobile/tablet: contém a caixa segura (600×470 em torno de 930,430), mas nunca menos que cobrir o palco */
    --u: max(min(calc(100vw / 600), calc(var(--st-h) / 470)), calc(100vw / 1600), calc(var(--st-h) / 900));
    --cx:930; --cy:430; --px:.5; --py:.52; }
}
.art{position:absolute;left:var(--ax);top:var(--ay);width:var(--W);height:var(--H);overflow:visible}
```
**Faixa intermediária (821–1199 px, paisagem).** Em 1024×768 a fórmula do desktop dá `u` = 0,937 e `ax` = −236. Uma etiqueta em x = 760 cairia em cerca de 476 px e a borda da caixa segura em cerca de 372 px, as duas sob o cartão (cuja borda direita fica em 504 px). Por isso:
```css
@media (min-width:821px) and (max-width:1199px) and (min-aspect-ratio:4/5){
  .scene{--px:.70}                          /* assunto mais à direita */
  html.mo .card{width:380px;margin-left:32px}
}
```
O critério de QA é o mesmo de antes: nenhuma etiqueta e nenhuma parte da caixa segura sob o cartão, medido também em 1024×768.

**Paisagem baixa (celular deitado, `(max-height:520px) and (orientation:landscape)`).** Nesse caso, que inclui 812×375:
- Vale o **modo estático visual**: a figura fica `position: relative` acima do cartão, com `height: 70vh` e sem palco fixo. Sem doca, sem trilho.
- O cartão tem 60 % da largura, centralizado.
- A timeline não é usada. Em CSS: `@media (max-height:520px) and (orientation:landscape){ html.mo .scene{position:relative;display:block;animation:none;transform:none;height:70vh} html.mo .tile{view-timeline:none} … }`. O `journey.js` lê o mesmo `matchMedia` para desligar o fallback.
- Entra nos `checks` de rolagem horizontal.

Conferências feitas no papel, que o engenheiro deve repetir com o script de QA:
- 1440×900: `u`=1,098, assunto a 62 %, bancada a 70 % (antes era 62 %, e havia 38 % de chão).
- 1280×720: horizonte a 70 %.
- 375×812, palco de 325 px: área visível x 607–1207, y 160–680 em unidades da arte. A caixa segura cabe.
- 768×1024, palco de 360 px: a área visível mede 1003×470 unidades, e a caixa segura também cabe.

O **fundo do ladrilho** (parede, rodapé de luz, bancada com veios e **frente do balcão**) é `background` da `.scene`, posicionado por `--hz`:
- parede: `linear-gradient(90deg, var(--wl), var(--wr))` até `--hz`;
- bancada: de `--hz` até `--hz + 22 %` da altura do palco;
- abaixo disso, a **frente do balcão**: uma faixa mais escura (`color-mix(in srgb, var(--br) 60%, #000)`) com filete de luz no topo.

Isso fecha o quadro embaixo e acaba com a "bancada infinita".

### 2.3 Palco e passagem
- `--st-h` e `--st-top`:
  - Desktop: `100lvh` e `0`; a figura fica atrás da barra, que é translúcida.
  - Mobile: `--stage: clamp(200px, 40svh, 360px)`, com `--st-top: var(--bar)`.
- No mobile a figura fica **acima** dos cartões. A ordem de empilhamento é palco 5, cartões 1 e barra/doca 20. O cartão rola por baixo do palco e só é lido na **janela de leitura**, que vai de `bar + stage` até `100svh − dock`.
- Ladrilhos em modo `mo`:
  ```css
  html.mo .tile{view-timeline:--t block; view-timeline-inset: var(--bar) 0px}      /* mobile: calc(var(--bar) + var(--stage)) var(--dock) */
  html.mo .scene{position:fixed;left:0;right:0;top:var(--st-top);height:var(--st-h);overflow:clip;display:none;will-change:transform;z-index:0}
  html.mo .tile.live>.scene{display:block}
  html.mo.sda .scene{animation:travel linear both;animation-timeline:--t}
  @keyframes travel{
    entry 0%,entry 25%{transform:translate3d(100%,0,0)}
    entry 75%,exit 25%{transform:none}
    exit 75%,exit 100%{transform:translate3d(-100%,0,0)}}
  /* .tile.first: só a saída; .tile.last: só a entrada (o epílogo cobre por cima) */
  @keyframes travel-first{exit 0%,exit 25%{transform:none} exit 75%,exit 100%{transform:translate3d(-100%,0,0)}}
  @keyframes travel-last {entry 0%,entry 25%{transform:translate3d(100%,0,0)} entry 75%,exit 100%{transform:none}}
  html.mo.sda .tile.first>.scene{animation-name:travel-first}
  html.mo.sda .tile.last>.scene{animation-name:travel-last}
  @keyframes far {from{transform:translate3d(4%,0,0)} to{transform:translate3d(-4%,0,0)}}
  @keyframes near{from{transform:translate3d(-9%,0,0)} to{transform:translate3d(9%,0,0)}}
  @keyframes tags{entry 0%,entry 80%{opacity:0} entry 92%,exit 8%{opacity:1} exit 20%,exit 100%{opacity:0}}
  @keyframes tags-first{exit 0%,exit 8%{opacity:1} exit 20%,exit 100%{opacity:0}}
  @keyframes tags-last {entry 0%,entry 80%{opacity:0} entry 92%,exit 100%{opacity:1}}
  html.mo.sda .art.far {animation:far  linear both;animation-timeline:--t}
  html.mo.sda .art.near{animation:near linear both;animation-timeline:--t}
  html.mo.sda .tags{animation:tags linear both;animation-timeline:--t}
  html.mo.sda .tile.first .tags{animation-name:tags-first}
  html.mo.sda .tile.last  .tags{animation-name:tags-last}

  /* empilhamento: desktop, palco ATRÁS do cartão; mobile, palco ACIMA do cartão */
  .card{position:relative;z-index:3}
  .epi{position:relative;z-index:8;background:var(--paper)}        /* cobre o último palco (que nunca sai) */
  .bar,.dock,.rail{z-index:20}
  @media (max-width:820px),(max-aspect-ratio:4/5){
    html.mo .scene{z-index:5}              /* sobrescreve o z-index:0 acima */
    html.mo .card{z-index:1}
  }
  ```
  Isso inclui o epílogo no mobile: como o último ladrilho não sai, o palco dele (z 5) ficaria por cima do epílogo. Por isso o epílogo tem z 8, acima do palco e abaixo da barra e da doca. Uma captura do epílogo em 375×812 entra nos `shots`.
- Para ladrilhos adjacentes **mais altos que a área útil**, "saída X %" de um e "entrada X %" do seguinte são o mesmo instante. Por isso as passagens colam. Mudar 25/75 exige mudar os dois lados e o fallback JS juntos.
- **Requisito de layout:** ladrilhos contíguos, sem nenhum vão vertical entre eles. Não pode haver margem, borda nem `<h2>` solto entre `.tile`s. Os títulos de dia ficam dentro do `<li>` com altura zero (ver 5.1). O ladrilho mede **≥ 1,6 × a área útil** no desktop e **≥ área útil + altura do cartão** no mobile (definido por `min-height` e pelo próprio conteúdo).
- **Fallback JS (`jsd`)**: um único `scroll` passivo agenda um `requestAnimationFrame`. Só os ladrilhos `.live` são processados (no máximo 2 ou 3). Para cada um, com `top0 = inset de cima` e `A = área útil`:
  ```js
  const r = tile.getBoundingClientRect();
  const en = clamp((top0 + A - r.top) / A), ex = clamp((top0 + A - r.bottom) / A);   // 0..1, como entry/exit do CSS
  const seg = (p) => clamp((p - .25) / .5);                                         // miolo 25 %→75 %
  const x = en < 1 ? (1 - seg(en)) * 100 : -seg(ex) * 100;                          // first/last: zera o lado ausente
  figure.style.transform = `translate3d(${x}%,0,0)`;   // + far/near pelo progresso de cobertura; tags pela mesma regra de 'tags'
  ```
  Critério: o deslocamento é igual ao do CSS com diferença ≤ 1 px, medido no meio de uma passagem nos dois motores (`?np-driver=js`).
- **Ladrilhos vivos**: `IntersectionObserver` com `rootMargin: '60% 0px'` marca `.live`. Fora disso a figura fica `display:none` e as animações em loop pausam (`.bub` etc. só animam em `html.mo .live`).
- **Etapa em foco**: outro `IntersectionObserver` com `rootMargin: '-45% 0px -54% 0px'`, como no protótipo. Ele atualiza o trilho, a doca, o texto de posição na barra e `LS:last`. **Não escreve o hash** (ver 4.3).
- **Âncoras**: os ids ficam no `.tile`. O `html` define `scroll-padding-top`: `var(--bar)` no desktop e `calc(var(--bar) + var(--stage))` no mobile em `mo`, o mesmo valor de 5.2. O `scroll-margin-top` do ladrilho é somado a isso:
  - desktop: `calc(32px - 62vh)`. O topo do ladrilho sobe até o cartão (que tem recuo de 62vh) ficar na posição sticky, e a cena já está parada, porque a entrada termina quando o topo do ladrilho passa a barra;
  - mobile: `0`. O topo do ladrilho, que é o topo do cartão, cai na borda de cima da janela de leitura.

  Verificar `#s8` e `#frio1` nos dois.
- **Cartão no desktop**: 440 px, `margin-left: 64px`, `position: sticky; top: var(--ctop)`. `--ctop` é calculado pelo JS como `min(bar + 32, innerHeight − altura − 16)`, para "Feito" ficar alcançável nos cartões altos (o protótipo já faz isso). O ladrilho tem `padding-top: 62vh`, como no protótipo: o cartão sobe durante a chegada da cena.
- **Mobile**: o cartão fica em fluxo normal, na largura total menos 24 px. O ladrilho tem `padding-top: 0`, porque o cartão entra na janela de leitura junto com a passagem, e `padding-bottom: 30vh`. Não existe rolagem interna.
- **Abertura no mobile**: formulário compacto. Em 375×812 o botão "Começar" precisa caber inteiro na janela de leitura sem rolar.

### 2.4 Desempenho
- Só `transform` e `opacity` mudam na rolagem. `will-change: transform` vai **só** na `.scene` e só em `.live`.
- **Proibido** em `.tile`, `<li>`, `<ol>`, `main` ou `body` no modo `mo`: `transform`, `filter`, `contain: paint/layout/strict`, `content-visibility`, `will-change`, `backdrop-filter`, `perspective`. Qualquer um deles transforma o ancestral em bloco de contenção da figura fixa e quebra o palco.
- `content-visibility: auto` só pode ir:
  - nas seções do epílogo (regras, glossário, Sobre), com `contain-intrinsic-size: auto 800px`;
  - nas `.scene` do **modo estático**, onde a figura não é fixa.
- Filtros:
  - `#paint` é estático, com um por ladrilho, rasterizado quando o ladrilho fica vivo (60 % antes de aparecer).
  - `#soft` só em `near` e nas manchas de luz.
  - O escurecimento do tema é `filter: brightness(var(--dim)) saturate(…)` CSS em `.art.sub` e `.art.near`, que é composto na GPU. Ele **não** é animado.
  - Se o Safari do iOS travar na passagem, a primeira medida é tirar `#paint` com `@supports (-webkit-touch-callout: none) { .art.sub g[filter] { filter: none } }`.
- Grão do papel: uma única camada fixa (`.grain`, SVG de ruído em `background-image`, opacidade 0,12), só em `mo`.
- Barra: `backdrop-filter` só no desktop; no mobile ela é opaca.
- LCP é o `<h1>` da abertura. A cena da abertura é SVG inline, sem requisição de imagem. Não há preload de imagem. Fontes como hoje (Google Fonts, `display=swap`, preconnect).
- CLS: figuras fixas ou com altura definida; números com `tabular-nums`; `[data-k]` com `min-width` em `ch` nos cartões; nada é inserido acima do conteúdo depois do carregamento. Os horários `data-when` ficam num `<span>` com `min-width: 9ch`.
- Fora do caminho crítico: as fotos do Sobre (`loading="lazy"`). O GSAP sai.

### 2.5 Movimento reduzido
- Sem `mo`: modo estático completo (2.1). Nenhuma animação, nada fixo. As etiquetas ficam visíveis. Panetti e anel são desenhados no estado final. As transições de interface viram `none`.
- O interruptor "Movimento da câmera" fica em Ajustes › Preferências. Ele grava `np-ui.motion` e recarrega a página. Com o sistema em `reduce`, o interruptor aparece desmarcado e desabilitado, com a nota `adj.motionSys`.
- Timer no modo reduzido: o anel avança em passos de 1 s e o cornicione não cresce.

---

## 3. Arquitetura de arquivos

### 3.1 O que sai (remoção na etapa E8; antes disso pode ficar no disco sem uso)

| Item | Ação | Verificação |
|---|---|---|
| `src/scene.js` | `git rm` | `grep -rn "scene.js\|SCENE_JS" src build.py` sem resultado |
| `build.py`: `TAKES`, `MOBILE_MQ`, `EASE_CAM`, `scene_photos`, `take_vars`, `scene_validate`, `scene_css`, `scene_sizes`, `scene_sources`, `scene_picture`, `scene_markup`, `scene_preload`, `win_html`, `scene_images`, `load_manifest`, `SCENE_DIR`, `SCENE_OUT`, `SRGB`, `WIDTHS`, `JPG_W`, `CAPS`, `CROP_FULL`, `run()`, a opção `--scene` e a linha correspondente na docstring | apagar | `python3 build.py --scene` não faz nada de especial; `grep -n "scene_\|TAKES\|manifest" build.py` só encontra `scenes`/`journey` novos |
| `docs/img/scene/` (35 arquivos, 4,4 MB) e `src/photos/scene/manifest.json` | `git rm -r` (o build **não** limpa o `docs/`) | `git ls-files docs/img/scene src/photos/scene` vazio |
| `recipe.json › scene` e `› scenes` (mapa do player) | apagar (substituídos por `journey`) | validação do build |
| `<l>.json` das receitas: `scene.*` (textos das janelas), `html.hero.*`, `html.kpi.*`, `steps.sub`, `oven.sub`, `rules.sub` se não forem reaproveitados | apagar o que o template novo não usa | o build falha em chave não usada (3.4) |
| `i18n/<l>.json`: `chap.1–6`, `foot.bgphoto`, `nav.watch`, `player.*`, `js.player`, `js.svg`, `kpi.*`, `nav.*` sem uso | apagar | idem |
| `photos.json`: campos `ow`, `oh`, `crop_m`, `crop_d`, `q` | apagar | o build não lê mais |
| `photos.steps` em `recipe.json` (pelati, dough, peel, leopard / nyfold) | renomear para `photos.gallery`. Essas fotos vão para o epílogo, na galeria "A pizza de verdade" com crédito | nenhuma `<img>` dentro de `.journey` (assert do build) |
| Player: `src/player.js`, `src/player-stage.svg`, a tag `<script>` do GSAP 3.12.2, o assert `#assistir` no `prerender()` e a troca `<g id="scn">` | `git rm` e apagar | `grep -rn "gsap\|player" src build.py` vazio |
| `src/illustrations.js` (miniaturas `IL`) e o campo `il` dos passos nos `<l>.json` | `git rm` e apagar o campo | idem |
| README, seção "Cenário (fotos)"; `.gitignore`, o comentário sobre derivadas (a linha `src/photos/originals/` **fica**) | reescrever | — |
| `src/style.css` e `src/template.html` antigos | **reescritos no lugar** na E1, com os mesmos nomes | — |

`src/original-pt.html` não faz parte deste trabalho; não mexa nele. Os originais em `src/photos/originals/` continuam fora do git.

### 3.2 O que entra

| Arquivo | Conteúdo |
|---|---|
| `src/template.html` (reescrito) | Esqueleto da página: `<head>` com o script de tema e modo, barra, `{{DEFS}}`, `<main>` com `{{OPENING}}`, `{{MISE}}`, `<ol class="journey">{{JOURNEY}}</ol>`, `{{EPILOGUE}}`, trilho, doca, `<dialog id="adj">`, `<dialog id="idx">`, rodapé, `<script>` com `T_JSON` + `{{APP_JS}}` + `{{JOURNEY_JS}}`. Os blocos `{{#pf}}`, `{{#sugar}}` e `{{#wsplit}}` continuam funcionando. |
| `src/style.css` (reescrito) | Tokens de interface (tabela 6 de `01-estrategia.md`), tokens de momento (1.2), câmera (2.2), ladrilhos (2.3), cartões, abertura, diálogo, trilho, doca, epílogo, modo estático, mobile e tema escuro. Parte do CSS do protótipo; o bloco `.tbl-wrap/table` e o das regras, glossário e Sobre podem vir do `style.css` atual. |
| `src/app.js` (novo, extraído do `<script>` atual) | `store`, `P`, `done`, `calc()` **sem nenhuma alteração**, `fmt`, `render()`, cronograma, mapa de inputs (agora dentro do diálogo), `setMode`, "feito", timer, diagnóstico, tema, idioma, JSON-LD e `window.NP`. |
| `src/journey.js` (novo) | Ladrilhos vivos, fallback JS da câmera, `--ctop`, etapa em foco, trilho, doca, índice, retomar, abertura (stepper e "Começar"), troca de receita levando a quantidade, desenho dos panetti e do anel/pizza, flash de valor alterado, mini-timer na barra. Não faz nada sob `?prerender`. |
| `src/scenes/defs.svg` + 9 composições + `pending.svg` | Ver 1.2 |
| `design/jornada/tools/cdp.mjs` (novo, versionado, fora do site) | Script de QA com CDP, sem dependências (Node com `WebSocket` global). Ver 6.2. |
| `design/jornada/baseline/` (novo, versionado) | `ld-<recipe>-<l>.json` com o JSON-LD gerado **antes** da E1, para comparação (6.1). |

`app.js` e `journey.js` são inseridos inline, como `scene.js` hoje (`.replace('</', '<\\/')`). Não há arquivos JS externos.

### 3.3 Como o `build.py` monta a página
Funções novas (nomes sugeridos):

```python
SCENES = SRC / 'scenes'
MOMENTS = ('dusk', 'eve', 'night', 'morning', 'noon', 'golden', 'ember', 'cold')
CALC_KEYS = {'flour','water','salt','oil','yeast','sugar','total','pfFlour','pfWater','pfTotal','finFlour','finWater',
             'saltWater','initWater','bassWater','n','per','alt','sauceTotal','cheeseTotal','cans','canSalt','top','bottom',
             'fridge','pfh','panh','outh','sauce','cheese','hydPct','saltPct','oilPct','yeastPct','sugarPct','w'}

def kspan(text):            # esc(text) e depois {k} -> <span class="v" data-k="k"></span>; assert k em CALC_KEYS; {size} -> targetSize literal
def scene_svg(comp, state, tokens):   # lê o fragmento, aplica <!--if-->, divide nas 4 camadas, devolve dict {far, sub, fx, near}
def tags_html(tags, d, c):  # <div class="tags" aria-hidden="true"><span class="tag" style="--xd:..;--yd:..;--xm:..;--ym:.." data-m="0|1">…</span></div>
def figure_html(tile, prev_light, d, c):   # <figure class="scene l-<light>" aria-hidden="true" data-scene=… style="--wl:…;--bl:…"> + 4 <svg class="art …" viewBox="0 0 1600 900"> + tags
def step_html(s, i, day_head, jcfg, d, c): # <li> [h2 do dia] <article class="tile step" id=…> figure + cartão </article> [aside.tile.cold] </li>
def opening_html(c, l, d), mise_html(c, l, d), epilogue_html(c, l, d)
```
Ordem dentro de `page()`:
1. `validate_journey(c, l, d)` (3.4).
2. Monta `rep` com `DEFS`, `OPENING`, `MISE`, `JOURNEY`, `EPILOGUE`, `APP_JS`, `JOURNEY_JS`, `CSS` e as chaves que já existem e continuam em uso (`HEAD`, `LANG_MENU`, `FOOT_*`, `RULES`, `GLOSSARY`, `ABOUT_*`, `TIMER_ZONES`, `TIMER_SCALE`, `CLOCK0`, `REF_*`, `TARGET`, `SPLIT_CLASS`, `T_JSON`, `NSTEPS`).
3. Os blocos condicionais.
4. Substituição de placeholders, com o assert de "chaves ausentes" que já existe.

`head()` perde a chamada `scene_preload(c)`.

**Timer na cena.** Para `oven/bake`, o build gera o anel a partir de `c['timer']`: `pathLength = max` e `stroke-dasharray`/`dashoffset` para as faixas `turn` e `ok`, como no protótipo, só que calculado. O cartão de `s14` (napolitana) e de `s11` (New York) recebe o bloco de timer, com faixa, mensagens e botões, reaproveitando `timer_markup()`. O cartão do timer é o que tem `"timer": true` em `journey.steps`.

**`T_JSON`** passa a levar:
- `cfg`: `id`, `targetSize`, `def`, `ls`, `features`, `warn`, `sched`, `timer`, `ld` e, novos, `journey` (ordem dos ladrilhos com `id`, `ev`, `n` e `title`) e `recipes` (lista com `id`, `path`, `ls`, `name`, `def.w`).
- As chaves `js.*` em uso.

Saem do `T_JSON`: `photos`, `player`, `svg`, `scenes` e `steps` (o texto já está no HTML; o JSON-LD é lido do DOM).

### 3.4 Validações novas no build (todas como `assert` com mensagem clara)
1. Toda etapa de `<l>.json › js.steps` tem entrada em `recipe.json › journey.steps`, e vice-versa. Os ids são idênticos nos dois idiomas.
2. `scene` existe em `src/scenes/` e `state` aparece em algum `<!--if:…-->` do arquivo (ou o arquivo não tem blocos). `light ∈ MOMENTS`. `ev` está dentro de `range(len(sched))`.
3. Toda `tag.t` existe no dict `tag` mesclado (i18n + receita) **nos dois idiomas**. Todo `{k}` de texto pertence a `CALC_KEYS ∪ {'size'}`.
4. Fragmentos: blocos `<!--if-->` não aninhados e fechados, nenhum `id=`, ≤ 1 `#paint` por estado, as 4 marcas de camada presentes, **≤ 14 KB e ≤ 260 elementos por ladrilho** já filtrado, e ≤ 240 KB de SVG por página. O build imprime a tabela `ladrilho · KB · elementos` com `--sizes`.
5. **Paridade de chaves pt/en**, recursiva, em `i18n/*.json` e em cada `recipes/*/<l>.json`.
6. **Chave não usada**: toda chave de `html.*` e de `tag.*` precisa ser referenciada pelo template ou pelo build. Isso evita lixo e pega erro de digitação.
7. No HTML final: nenhuma `<img>` dentro de `<ol class="journey">`; o nome da receita aparece no `<h1>` (o assert de hoje continua); os ids são únicos (`re.findall(r' id="([^"]+)"')`, sem duplicados).
8. `leak_check` continua valendo e agora também vê as etiquetas HTML. Por isso as palavras das etiquetas da New York vêm do `tag` da própria receita.

### 3.5 Mapeamento etapa → cena + estado + etiquetas (`recipe.json › journey`)
Esquema:

```json
"journey": {
  "open":  {"scene": "bench", "state": "open", "light": "dusk"},
  "mise":  {"scene": "bench", "state": "mise", "light": "eve",
            "tags": [{"t": "flour", "at": [700, 330], "m": [660, 250]}, …]},
  "steps": {
    "s1": {"scene": "jar", "state": "pref", "light": "night", "ev": 0,
           "tags": [{"t": "pfFlour", "at": [806, 176]}, {"t": "pfWater", "at": [800, 232]}, {"t": "yeast", "at": [808, 288]}]},
    "s14": {"scene": "oven", "state": "bake", "light": "ember", "ev": 6, "timer": true}
  },
  "cold": [{"id": "frio1", "after": "s1", "state": "jar", "light": "cold", "ev": 1, "big": "pfh"}],
  "end": "ember"
}
```

- `at` é o canto superior esquerdo da etiqueta em unidades da arte (desktop). `m` é a posição opcional para o mobile. `"m": null` esconde a etiqueta no mobile; o máximo no mobile é **3 etiquetas**.
- No desktop, `at.x ≥ 760`, para a etiqueta não ficar sob o cartão. O QA confere.
- `big` é a chave do número grande do interlúdio ("≈ 20 h").

**Napolitana**

| tile | scene/state | light | ev | etiquetas (chaves do dict `tag`) |
|---|---|---|---|---|
| abertura | bench/open | dusk | — | — |
| mise | bench/mise (+pf) | eve | — | flour, water, salt, oil, yeast (mobile: flour, water, salt) |
| s1 | jar/pref | night | 0 | pfFlour, pfWater, yeast |
| frio1 | fridge/jar | cold | 1 | big = pfh |
| s2 | bowl/mix | morning | 2 | salt, initWater, finFlour |
| s4 | bowl/bass | morning | 2 | bassWater, slowly |
| s5 | slab/fold | noon | 2 | fold |
| s6 | bowl/oil | noon | 2 | oil |
| s7 | slab/lam | golden | 2 | lam, rest1h |
| s8 | tray/balls | golden | 3 | nPer, total (panetti desenhados) |
| frio2 | fridge/tray | cold | 3 | big = panh |
| s9 | tray/temper | dusk | 4 | outh (panetti desenhados, maiores) |
| s10 | sauce/napo | dusk | 4 | cans, cheeseTotal |
| s11 | oven/preheat | eve | 5 | top, bottom |
| s12 | slab/open | eve | 6 | size, rim |
| s13 | oven/build | ember | 6 | sauce, cheese |
| s14 | oven/bake | ember | 6 | (anel do timer) · `timer: true` |

**New York** (mesmas composições; a luz do dia 1 é a noite)

| tile | scene/state | light | ev | etiquetas |
|---|---|---|---|---|
| abertura | bench/open | dusk | — | — |
| mise | bench/mise (+sugar) | eve | — | flour, water, salt, oil, yeast, sugar (mobile: 3) |
| s1 | bowl/mix | night | 0 | flour, water, yeast |
| s2 | bowl/oil | night | 0 | oil |
| s3 | slab/knead | night | 0 | knead |
| s4 | bowl/rest | night | 0 | rest1h |
| s5 | tray/pots | night | 0 | nPer, total |
| frio | fridge/pots | cold | 1 | big = panh |
| s6 | tray/pots-temper | dusk | 2 | outh |
| s7 | sauce/ny | dusk | 2 | cans, cheeseTotal |
| s8 | oven/preheat | eve | 3 | top, bottom |
| s9 | slab/open | eve | 4 | size, rim |
| s10 | oven/build | ember | 4 | sauce, cheese |
| s11 | oven/bake | ember | 4 | (anel) · `timer: true` |
| s12 | slice/ny | ember | 4 | — |

---

## 4. Contratos de dados, i18n e estado

### 4.1 Chaves i18n novas (`src/i18n/pt.json` e `en.json`, mesmas chaves)
Em `html` (o build as escapa e insere):

```
ask.recipe  "Receita" / "Recipe"            ask.qty "Quantidade" / "Amount"
ask.byFlour "Farinha (g)" / "Flour (g)"     ask.byPizza "Nº de pizzas" / "No. of pizzas"
ask.less "Diminuir" / "Decrease"            ask.more "Aumentar" / "Increase"
ask.go "Começar" / "Start"                  ask.restart "Começar do início" / "Start over"
ask.fine "O resto usa o padrão da versão {v} e pode ser ajustado a qualquer momento." / "Everything else uses the v{v} defaults and can be changed any time."
bar.adjust "ajustar" / "adjust"             bar.adjustAria "Ajustar a massa e os parâmetros" / "Adjust dough and settings"
nav.skip (já existe; o alvo muda para #jornada)   nav.steps (já existe)
step.label "Etapa" / "Step"   step.done "Feito" / "Done"   step.next "Próxima" / "Next"
step.how "Como saiu?" / "How did it turn out?"    step.now "agora" / "now"
dock.prev "Etapa anterior" / "Previous step"      dock.next "Próxima etapa" / "Next step"   dock.index "Todas as etapas" / "All steps"
rail.label "Etapas" / "Steps"
mise.eb "Prólogo" / "Prologue"   mise.h "Mise en place" / "Mise en place"   mise.p "Tudo pesado antes de começar." / "Weigh everything before you start."
cold.eb "Geladeira" / "Fridge"   cold.next "Próximo passo" / "Next step"
epi.eb "Epílogo" / "Epilogue"    epi.h "A primeira pizza *calibra a sessão.*" / "The first pizza *calibrates the session.*"
epi.p "Diga como saiu e o forno se ajusta." / "Tell us how it came out and the oven adjusts."
epi.back "Voltar à pergunta inicial" / "Back to the first question"
epi.gallery "A pizza de verdade" / "The real thing"
adj.h "Ajustes" / "Settings"   adj.close "Fechar" / "Close"   adj.dough "Massa" / "Dough"
adj.formula "Fórmula" / "Formula"   adj.env "Ambiente e forno" / "Room and oven"   adj.toppings "Coberturas" / "Toppings"
adj.agenda "Agenda" / "Schedule"   adj.recipe "Receita completa" / "Full recipe"   adj.prefs "Preferências" / "Preferences"
adj.motion "Movimento da câmera" / "Camera motion"
adj.motionSys "Desligado pelo sistema (movimento reduzido)." / "Off: your system asks for reduced motion."
```
Em `js` (o JS usa):
- `resume`: "Continuar na etapa {n} · {t}" / "Continue at step {n} · {t}"
- `pos`: "{day} · etapa {n} de {N}" / "{day} · step {n} of {N}"
- `askSumFlour`: "≈ {n} pizzas de {per} g · massa total {total} g"
- `askSumPizza`: "≈ {flour} g de farinha · massa total {total} g"
- `barSum`: "{flour} g · {n} pizzas"
- `left`: "faltam {rel}" / "{rel} left"
- `start`: "role para começar" / "scroll to start"
- `epiSub`: "diagnóstico e caderno" / "diagnosis and notes"

Dicionário `tag` (topo do i18n). O texto pode ter `{k}`. Valores pt:

| chave | pt |
|---|---|
| flour | "{flour} g farinha" |
| pfFlour | "{pfFlour} g farinha" |
| finFlour | "{finFlour} g farinha" |
| water | "{water} g água" |
| pfWater | "{pfWater} g água" |
| initWater | "{initWater} g água" |
| bassWater | "{bassWater} g água" |
| salt | "{salt} g sal" |
| oil | "{oil} g azeite" |
| yeast | "{yeast} g fermento" |
| sugar | "{sugar} g açúcar" |
| nPer | "{n} × {per} g" |
| total | "total {total} g" |
| cans | "{cans} × lata 400 g" |
| cheeseTotal | "{cheeseTotal} g queijo" |
| sauce | "{sauce} g molho" |
| cheese | "{cheese} g queijo" |
| top | "↑ {top} °C" |
| bottom | "↓ {bottom} °C" |
| outh | "{outh} h fora" |
| rest1h | "1 h" |
| slowly | "aos poucos" |
| size | "Ø {size}" |

As etiquetas próprias de cada receita ficam em `src/recipes/<id>/<l>.json › tag` e o `merge()` as sobrepõe:
- napolitana: `fold` "estique · dobre · descanse", `lam` "sem rolo · sem rasgar", `rim` "borda 1–1,5 cm";
- New York: `knead` "empurre · dobre · gire", `rim` "borda ~1 cm".

Em inglês, os textos vêm das chaves equivalentes de `js.player.lbl` atuais (`foldN`, `lam`, `rimN`, `rimNY`, `foldNY`…), para não traduzir de novo.

Chaves novas por receita, em `recipes/<id>/<l>.json`:
- `html.ask.h1` contém o **nome da receita**. Ex. pt napolitana: "Pizza *napolitana*: quanta vai sair?"; New York: "Pizza *New York*: quanta vai sair?"; en: "*Neapolitan* pizza: how much?". O `*…*` vira `<em>`.
- `html.ask.lead`: uma linha.
- `html.ask.sub`: a linha do cartão de receita, ex. "3 dias · pré-fermento" ou "48 h de geladeira". A NY não pode citar termos de `LEAKS`.
- `cold.<id>.h` / `cold.<id>.p`: ex. napolitana `frio1` "Geladeira · noite" / "O pré-fermento trabalha no frio. O cronograma conta a partir da hora de assar."; `frio2`, e NY `frio`.

### 4.2 Estado em `localStorage` (compatível com o de hoje)

| chave | conteúdo | status |
|---|---|---|
| `<ls>:p` (`ls` = `napolitana-v1` / `newyork-v1`) | parâmetros: `mode, flour, pizzas, w, hyd, salt, oil, yeast, sugar, pf, fridge, top, bottom, sauce, cheese, pfh, panh, outh, bake` | **igual a hoje**, sem migração |
| `<ls>:done` | `{s1: true, …}`, com os ids atuais (a napolitana **não tem s3**) | igual |
| `<ls>:last` | `{id: "s8", t: 1731700000000}` | novo |
| `np-theme` | `{theme, until}`: escolha manual válida até a próxima virada das 7 h ou das 19 h | igual; **não** copiar o tema permanente do protótipo |
| `np-lang` | idioma | igual |
| `np-ui` | `{motion: bool}` | novo |

**Troca de receita** (na abertura, no diálogo ou no rodapé):
1. São `<a href>` normais, que funcionam sem JS.
2. Com JS, antes de navegar: `const n = calc().n`, depois `store.set(dest.ls + ':p', Object.assign({}, store.get(dest.ls + ':p') || {}, {mode: 'pizza', pizzas: n}))`.
3. Leva o **número de pizzas**, nunca os gramas de farinha, porque o peso dos panetti difere (270 g contra 300 g).

### 4.3 Retomar e hash
- **O hash nunca é escrito pela rolagem.** Só links (trilho, doca, "Próxima") mudam o hash, e o fazem nativamente.
- Ao abrir **sem** hash e com `<ls>:last`, a abertura mostra o botão principal "Continuar na etapa NN · título". "Começar do início" passa a secundário. Clicar rola até o ladrilho com `scrollIntoView`, só por clique.
- Com hash, o navegador vai para a âncora e o botão de retomar continua lá na abertura.
- Etapa "agora" pelo cronograma: o último evento já começado cujo sucessor ainda não começou. Ela ganha o selo nos cartões daquele `ev` e no trilho. A abertura mostra "Próximo: …" no `#nextEv` (lógica que já existe).

---

## 5. Semântica e acessibilidade

### 5.1 Estrutura
```html
<a class="skip" href="#jornada">…</a>
<header class="bar"> marca · <span id="pos"> · <button id="openAdj" aria-haspopup="dialog"> resumo </button> · <span id="mini" hidden> · tema · idioma </header>
<svg class="defs" …>{{DEFS}}</svg>  <div class="grain" aria-hidden="true"></div>
<main>
  <section class="tile first open" id="abertura" aria-labelledby="h1">  <figure class="scene …" aria-hidden="true">…</figure>
     <form class="card ask" id="ask"> <h1 id="h1">…</h1> <fieldset><legend>Receita</legend> 2 links-cartão (aria-current) </fieldset>
       <fieldset><legend>Quantidade</legend> seg (2 botões aria-pressed) · stepper (− input +) · <p id="sum" aria-live="polite"> </fieldset>
       <a id="resume" hidden> · <button type="submit">Começar</button> · <a class="next" id="nextEv" hidden> · <p class="fine"> </form></section>
  <section class="tile mise" id="mise" aria-labelledby="h-mise"> figure + cartão com a <table> atual, divisão da água, divisão em bolas, coberturas, #warnBox </section>
  <h2 class="sr" id="jornada">{{nav.steps}}</h2>
  <ol class="journey">
    <li> <h2 class="day-h sr">Dia 1 · noite</h2>   ← só no 1º <li> de cada dia; altura zero
      <article class="tile step" id="s1" aria-labelledby="h-s1" data-ev="0" data-n="01">
        <figure class="scene l-night" aria-hidden="true">4×<svg class="art"> + <div class="tags"></figure>
        <div class="card"> <p class="eyebrow">Dia 1 · Etapa 01 <span class="when" data-when></span></p> <h3 id="h-s1">…</h3>
          <div class="chips">tempo · origens</div> <ul class="ins"><li>…<span class="v" data-k="pfFlour"></span>…</li></ul> <p class="tip">…</p>
          <div class="foot"><label class="done"><input type="checkbox" data-step="s1"> Feito</label> <a class="next" href="#frio1">Próxima ↓</a></div></div>
      </article>
      <aside class="tile cold" id="frio1" aria-labelledby="h-frio1"> figure + cartão (h3, número grande, "faltam …", Assar em → abre Ajustes › Agenda) </aside>
    </li> …
  </ol>
  <section class="epi" id="epilogo"> diagnóstico · regras · glossário · Sobre (+ galeria) · voltar ao início </section>
</main>
<nav class="rail" aria-label="Etapas"> 13 links (44×44) + contador </nav>
<nav class="dock" aria-label="…"> ‹ · <button aria-haspopup="dialog">03/13 · título</button> · › </nav>
<dialog id="adj" aria-labelledby="adjH"> … </dialog>  <dialog id="idx" aria-labelledby="idxH"> lista de links </dialog>
<footer> (rodapé atual: assinatura, receitas, idiomas, ©) </footer>
```
- Os títulos de dia e o `<h2 id="jornada">` são `.sr` (visualmente ocultos, altura zero). O dia aparece no sobrelinha do cartão. Os títulos no leitor de tela seguem a ordem h1 → h2 (dia) → h3 (etapa).
- **Interlúdio** dentro do `<li>` da etapa anterior: não altera a numeração e mantém a contiguidade dos ladrilhos.
- `figure.scene` e `.tags` são `aria-hidden="true"`. **Toda quantidade da etiqueta está também no texto do cartão.** Isso é critério de revisão: para cada `tag.t`, a chave correspondente aparece no cartão daquela etapa. Exceções aceitas: `slowly`, `fold`, `lam`, `knead`, `rest1h`, `rim` e `size`, que são texto de apoio.
- O "Feito" é `<input type="checkbox">` com rótulo, alvo de 56 px de altura.

### 5.2 Teclado e foco
- Ordem: pular → barra → abertura → prólogo → etapas → epílogo → rodapé → trilho/doca. Os elementos fixos vêm por último no DOM.
- Foco visível: `outline: 3px solid var(--focus); outline-offset: 3px`, com contraste ≥ 3:1 sobre papel e sobre as cenas.
- Nenhum atalho de tecla única. Espaço e PageDown rolam nativamente e a câmera acompanha.
- `<dialog>` modal: `showModal()`, fecha com Esc, com o botão ✕ (`<form method="dialog">`) e com clique no `::backdrop` (`e.target === dlg`). O foco volta ao `#openAdj` porque o `<dialog>` nativo já faz isso; verificar. A primeira seção `<details open>` é "Massa".
- Elementos que ficam sob o palco no mobile: quando um elemento focado está atrás do palco, `scroll-padding-top: calc(var(--bar) + var(--stage))` em `html` (só no mobile e em `mo`) garante que o foco por Tab o traga para a janela de leitura. No desktop, `scroll-padding-top: var(--bar)`.

### 5.3 Alvos e contraste
- Alvos ≥ 44 px em tudo: trilho 44×44, pílula da barra 44, ícones 44, doca 56, "Feito" 56, stepper 56, botões principais 56.
- O trilho mostra só as etapas (13 ou 12 links × 44 px). Com `max-height: 680px` ele some e a doca aparece também no desktop.
- Texto só sobre `--paper`/`--paper-2`. Tokens de 6 em `01-estrategia.md`, AA com folga.
- **Etiquetas**: `background: var(--kraft); color: var(--kraft-ink)`, fora do grupo escurecido.
  - Claro: `--kraft: #EBD3A6`, `--kraft-ink: #2A1D14` (≈ 11:1).
  - Escuro: `--kraft: #CDB083`, `--kraft-ink: #1B120B` (≈ 8,5:1).
  - Medir sobre a cor real. Exigência: **≥ 7:1 nos dois temas**.
- Fonte das etiquetas: `700 clamp(15px, calc(var(--u) * 30), 24px) var(--f-m)` para o número e `400 clamp(13px, calc(var(--u) * 24), 19px) var(--f-t)` para a palavra. O mínimo de 15/13 px vale no mobile.
- Texto da barra sobre a cena no desktop: o fundo é `--paper` a 90 %, e o contraste do texto secundário deve ficar ≥ 4,5:1 no pior caso (cena `ember` no escuro). Medir.

---

## 6. Critérios de qualidade e QA

### 6.1 Critérios de aceitação (todos obrigatórios no fim)
1. `python3 build.py` termina em `ok`. Nenhum aviso de orçamento de SVG.
2. Pré-render nas 4 páginas:
   - o texto das 13/12 etapas e os números padrão estão no HTML (ex.: napolitana pt contém `data-k="pfFlour">400<`, `data-k="bassWater">18<`, `data-k="n">5<`);
   - existe `<script type="application/ld+json" id="ld-recipe">`;
   - `recipeInstructions` e `recipeIngredient` são **idênticos** aos de `design/jornada/baseline/` (mesmo `name`, `text` e `url#sN`);
   - `<html>` sem as classes `js`, `mo`, `sda` ou `jsd`; nenhum `class="… live"`; nenhum `style="transform` em `.scene`; `data-when` vazio; nenhum `#resume` visível.
3. URLs: `/pt/`, `/en/`, `/pt/new-york/`, `/en/new-york/` existem; `/es/`, `/it/` e `/zh/` (com e sem `new-york/`) redirecionam; `404.html`, `sitemap.xml`, `robots.txt` e `CNAME` continuam iguais aos de hoje (`git diff docs/sitemap.xml` vazio, exceto `lastmod` se mudar).
4. Sem rolagem horizontal (`scrollWidth ≤ innerWidth`) em 360, 375, 768, 1024, 1280, 1440 e 1920 px, nos dois temas, com movimento e sem.
5. Console sem erros nem avisos nas 4 páginas, nos modos `sda`, `jsd` e estático.
6. Desempenho (CDP: rede "Slow 4G" e CPU 4×, servidor local):
   - LCP < 2,5 s no mobile 375×812 e no desktop 1440×900;
   - CLS < 0,1 numa rolagem completa da página (meta: ≤ 0,02);
   - nenhuma tarefa > 200 ms durante a rolagem;
   - ladrilhos com `display` ativo ≤ 3 em qualquer posição.
7. Emenda: no meio de cada passagem, as bordas dos dois ladrilhos coincidem com diferença ≤ 1 px, e `sda` e `jsd` dão o mesmo deslocamento (≤ 1 px).
8. **Problema 1 (passagens):** em capturas do meio de todas as passagens, em 1440×900 e 375×812, nenhuma etiqueta está visível (opacidade < 0,05). Com a cena parada, todas as etiquetas estão inteiras no palco e nenhuma cruza o retângulo do cartão (desktop). A soma da altura de "chão vazio" (bancada sem objeto) no quadro do meio da passagem fica ≤ 30 % da altura, verificado a olho nas capturas.
9. **Problema 2 (mobile):** em 375×812, no meio da leitura das etapas mais longas (napolitana `s2` e `s12`, NY `s1` e `s9`):
   - o retângulo do palco está 100 % visível;
   - nenhum cartão aparece sobre ele (`elementFromPoint` no centro do palco devolve um nó da `figure`);
   - "Feito" pode ser alcançado rolando;
   - não existe rolagem interna.
   Na abertura, "Começar" está inteiro na tela sem rolar.
10. **Problema 3 (contraste):** etiquetas ≥ 7:1 e todo texto de interface ≥ 4,5:1 (texto grande ≥ 3:1), claro e escuro, medidos com o script.
11. Quantidades na napolitana, com 800 g e os padrões da v1.0:
    - 400 / 400 / 0,8 no pré-fermento;
    - 23 g de sal em 94 g de água;
    - 18 g de bassinage;
    - 5 × 270 g, total 1.348 g;
    - 7 pizzas → 1.122 g de farinha.

    Mudar a abertura ou os Ajustes atualiza etiquetas, cartões, tabela e panetti desenhados sem recarregar. O resultado é igual ao `calc()` atual.
12. Ferramentas:
    - Ajustes: todos os campos atuais, incluindo `sugar`, `pf` e `pfh` conforme a receita;
    - restaurar e limpar funcionam;
    - agenda com `#timeline`, `#schedWarn` e `#nextEv`;
    - "agora" aparece;
    - timer: inicia, pausa, continua e zera, com as faixas da receita; o anel e o mini-timer acompanham; continua certo com a aba em segundo plano (baseado no relógio);
    - diagnóstico "aplicar" altera `top`/`bottom` e as etiquetas do forno;
    - "Feito" e o progresso persistem;
    - retomar funciona;
    - trocar de receita leva o número de pizzas.
13. Movimento reduzido (`prefers-reduced-motion` emulado e interruptor): nenhuma `.scene` fixa, nenhuma animação rodando (`document.getAnimations().length === 0`), tudo utilizável.
14. Teclado: Tab do topo ao rodapé, sem armadilha, foco sempre visível e nunca escondido sob o palco no mobile; o diálogo prende o foco e o devolve.
15. Nenhum vão entre ladrilhos: para todo par consecutivo, `next.getBoundingClientRect().top − prev.getBoundingClientRect().bottom === 0`.
16. **Sem scroll-jacking:**
    - nenhum `preventDefault` em `wheel`, `touchmove` ou `keydown` de rolagem (verificar com `grep` no `app.js` e no `journey.js`);
    - nenhum `scroll-snap-type`;
    - `scrollTo`/`scrollIntoView` só em resposta a clique;
    - via CDP, depois de N eventos `Input.dispatchMouseEvent` do tipo `mouseWheel` com `deltaY` = 100, `scrollY` = N × 100 (± 1).
17. Layouts extras: 1024×768 (faixa intermediária, critérios 8 e 9 de sobreposição com o cartão) e 812×375 (paisagem baixa: estático, sem rolagem horizontal, "Feito" alcançável).

### 6.2 Ferramenta de QA: `design/jornada/tools/cdp.mjs`
Node 18+ (o `WebSocket` global já existe aqui) e nenhuma dependência.
1. **Abrir o Chrome:** inicia com `--headless=new --remote-debugging-port=9333 --hide-scrollbars --no-first-run --user-data-dir=<tmp>` e lê `http://127.0.0.1:9333/json/version`.
2. **Servir o site:** sobe `python3 -m http.server 8770 --directory docs`. Sem gzip; anotar isso no relatório.
3. **Por cenário:**
   - aplica `Emulation.setDeviceMetricsOverride` com `{width, height, deviceScaleFactor: 2, mobile: width < 820}`. **Não use `--window-size`**: abaixo de 500 px o headless não emula mobile;
   - aplica `Emulation.setEmulatedMedia` com `prefers-reduced-motion` quando o cenário pedir;
   - grava o tema em `np-theme`, com `until` no futuro, via `Page.addScriptToEvaluateOnNewDocument`;
   - navega e espera `document.fonts.ready`.
4. **Subcomandos:**
   - `shots`: capturas de cada ladrilho parado e do meio de cada passagem, salvas em `design/jornada/qa/<etapa>/<vp>-<tema>-<id>.png`. Rolar com `window.scrollTo` e aguardar 2 `requestAnimationFrame`;
   - `checks`: critérios 4, 7, 8, 9, 10 e 15, com saída JSON e código de saída ≠ 0 se algum falhar;
   - `perf`: critério 6, com `PerformanceObserver` para LCP, CLS e longtask, `Network.emulateNetworkConditions` e `Emulation.setCPUThrottlingRate`;
   - `func`: critérios 11 a 13;
   - `kb`: critério 14, com `Input.dispatchKeyEvent` Tab.
5. **Contraste:** cor computada do texto contra a cor de fundo do próprio elemento (as etiquetas têm fundo sólido). Para o texto da barra sobre a cena, amostrar pixels da captura com o texto oculto e usar o pior pixel.

Lembrete: **o painel de navegador do app congela pintura e `requestAnimationFrame` quando está oculto.** Toda prova visual e todo teste de timer ou de rolagem usa CDP com Chrome headless, nunca o painel. Viewports obrigatórios: **375×812, 768×1024, 1280×720 e 1440×900**, nos temas claro e escuro, mais o movimento reduzido em 375 e 1440. Complementos:
- 1024×768: faixa intermediária, sobreposição com o cartão;
- 812×375: paisagem baixa;
- 360×640 e 1920×1080: rolagem horizontal;
- `?np-driver=js` em 1440 e 375.

---

## 7. Plano incremental

Regras para todas as etapas:
- Trabalhar na branch `redesign-imersivo`.
- Ao fim de cada etapa: `python3 build.py` → `ok`, as verificações listadas, e um commit com mensagem em português ("Jornada E3: …").
- **Nada vai para `main`** até a E10 aprovada, porque o GitHub Pages publica do `main`.
- Registrar o andamento em `design/jornada/03-implementacao.md`: o que foi feito, as medições e os desvios deste plano, com o motivo.

### E0 · Linha de base e ferramenta (≈ 1 h)
- Rodar `python3 build.py` no estado atual.
- Extrair o JSON-LD das 4 páginas para `design/jornada/baseline/ld-<id>-<l>.json`.
- Criar `design/jornada/tools/cdp.mjs`, só com `shots` e `checks` mínimos (rolagem horizontal e console), e rodá-lo contra o site atual para validar a ferramenta.

**Verificar:** os 4 JSON existem, e uma captura 375×812 com `mobile:true` mostra o layout mobile do site atual.

### E1 · Esqueleto da jornada, build e abertura (≈ 6 h)
- **`build.py`:**
  - adicionar `kspan`, `scene_svg`, `figure_html`, `tags_html`, `step_html`, `opening_html`, `mise_html`, `epilogue_html` (o epílogo por enquanto só com regras, glossário, Sobre e rodapé atuais) e `validate_journey` (itens 1, 2, 3 e 7 de 3.4);
  - em `page()`, remover do `rep` as chaves `SCENE`, `SCENE_CSS`, `HTML_STYLE`, `SCENE_JS`, `H1` antigo, `HERO_CREDIT`, `WIN_*`, `FIN_*`, `PLAYER_*`, `IL`, e não chamar mais `scene_validate`;
  - em `head()`, remover `scene_preload`;
  - em `prerender()`:
    - remover a troca `scn` e o assert `#assistir`;
    - trocar `'class="step"'` por `'class="tile step'`;
    - na troca `nextEv`, trocar `href="#cronograma"` por `href="#adj-agenda"`, mudando o regex e o texto de substituição juntos;
    - acrescentar os asserts do critério 2: classes de `<html>`, `live`, `transform`, `data-when`;
  - incluir em `prerender()` a limpeza do atributo `class` de `<html>`, junto com a de `data-theme`;
  - as funções antigas de cenário ficam no arquivo, sem uso, até a E8.
- **`recipe.json`** das duas receitas: criar `journey` completo (tabelas de 3.5). Para tudo que ainda não foi pintado, usar `"scene": "pending"` com a luz certa.
- **`src/scenes/defs.svg`**: gradientes, filtros e os símbolos do protótipo. **`src/scenes/pending.svg`**: só `far`, com prateleira e janela.
- **`src/template.html` e `src/style.css`**:
  - reescritos conforme 5.1, 2.2 e 2.3: tokens, momentos, câmera, ladrilhos, cartões, abertura, modo estático e mobile com o palco no topo;
  - **já na E1**, sem estilo próprio, com os **ids atuais**:
    - a marcação do `<dialog id="adj">` com todos os campos e seções (Agenda com `<ol class="tl" id="timeline">`, `<div class="alert" id="schedWarn" hidden>` e o `id="adj-agenda"` no `<details>`);
    - o `#nextEv` na abertura;
    - o bloco do timer no cartão `timer: true` (`#clock`, `#head`, `#tStatus`, `#tStart`, `#tReset`);
    - o diagnóstico no epílogo (`#chips`, `#diagOut`);
    
    Assim as trocas do pré-render e o JS atual encontram tudo. A E4 só estiliza e completa o comportamento;
  - o `<script>` passa a ser `{{APP_JS}}` + `{{JOURNEY_JS}}`.
- **`src/app.js`**:
  - mover para cá o código do `<script>` atual, **mantendo `calc()` byte a byte**;
  - remover `renderSteps` (os passos agora vêm do build), a ponte `qN/qSum`, `#progTxt/#progBar` (substituídos pelo trilho e pela doca) e `#panelToggle`;
  - criar o helper `const on = (id, ev, fn) => { const e = document.getElementById(id); if (e) e.addEventListener(ev, fn); return e; }` e usá-lo em **todas** as ligações de evento. Nenhum `getElementById(...).onclick` solto: se um elemento faltar, a página não pode quebrar;
  - deixar `render()` tolerante a elementos ausentes (`?.`);
  - **JSON-LD numa função própria `buildLD()`**, chamada logo depois do primeiro `render()` e **antes** de inicializar timer, diagnóstico e tema. Um erro numa ferramenta não pode impedir o `id="ld-recipe"`. Seletores novos: passos `.journey article.step` (`name` = `h3`, `text` = `ul.ins > li`, `url` = `L.url + '#' + id`); ingredientes `#mise tbody tr:not(.total):not([hidden])`.
- **`src/journey.js`**: `live`, a câmera (os dois motores), o foco, a abertura (seg, stepper, resumo, "Começar" rola até `#s1`), o retomar e `--ctop`, tudo coberto por `if (/prerender/.test(location.search)) return`.
- **Textos**: chaves de 4.1 nos 4 arquivos de receita e nos 2 de i18n (`ask.*`, `step.*`, `tag`, `cold.*`, `mise.*`), já em pt **e** en. Se faltar uma tradução, usar um texto provisório marcado `[EN]` e listá-lo no `03-implementacao.md`.

**Verificar:**
- `ok` nas 4 páginas;
- `grep -c 'class="tile step' docs/pt/index.html` dá 13, e em `docs/pt/new-york/index.html` dá 12;
- os números do critério 11 aparecem no HTML;
- o JSON-LD é igual à linha de base (critério 2);
- capturas 1440×900 e 375×812 da abertura e de duas passagens, com cenas `pending` e a parede mudando de cor sem emenda;
- critério 15 (sem vão);
- console limpo.

### E2 · Sistema de cena e as 3 primeiras composições (≈ 8 h)
- Implementar `bench` (`open`, `mise`), `jar` (`pref`) e `bowl` (`mix`, `bass`), partindo do protótipo e já com as regras de 1.2:
  - bancada a 600, caixa segura, adereços laterais e primeiro plano;
  - etiquetas em HTML (`.tags`) com a animação `tags` e o equivalente no fallback JS;
  - escurecimento do tema em `.art.sub`/`.art.near`, e etiquetas fora dele.
- Ligar no `journey` da napolitana: abertura, mise, s1, s2 e s4. A New York aproveita `bench` e `bowl/mix` (s1).
- Criar o tamanho de ladrilho (`--sizes`) e a validação do item 4 de 3.4.

**Verificar:**
- `cdp.mjs shots` em 1440×900, 1280×720, 768×1024 e 375×812, claro e escuro: abertura, mise, s1, s2, s4 e as 4 passagens entre eles;
- `checks`: critérios 7, 8 (só esses ladrilhos), 9 em s2, 10 e 15;
- orçamento de KB e de elementos impresso e dentro do limite;
- revisão visual lado a lado com o protótipo: o nível de pintura não pode cair.

### E3 · Demais composições da napolitana (≈ 14 h, pode ser dividida por composição)
- Ordem: `bowl/oil`, `slab` (`fold`, `lam`, `open`), `tray` (`balls`, `temper`, com `data-draw="balls"` no `journey.js`, reaproveitando `drawBalls` do protótipo e respeitando o primeiro plano), `fridge` (`jar`, `tray`, com interlúdios completos: número grande, "faltam …", link para Agenda), `sauce/napo`, `oven` (`preheat`, `build`, `bake`, com o anel gerado pelo build a partir de `timer`).
- Uma composição por commit.

**Verificar:** os mesmos `shots` e `checks` para cada composição nova. Os 17 ladrilhos da napolitana pt estão sem `pending`. A tabela de tamanhos está toda dentro do orçamento.

### E4 · Ferramentas (≈ 8 h)
- **`<dialog id="adj">`:**
  - seções de 4.1 com os **mesmos ids** de input de hoje (`p-flour`, `p-pizzas`, `p-w`, `p-hyd`, `p-salt`, `p-oil`, `p-yeast`, `p-sugar`, `p-pf`, `p-fridge`, `p-top`, `p-bottom`, `p-sauce`, `p-cheese`, `p-bake`, `p-pfh`, `p-panh`, `p-outh`) e os botões `#modeFlour`/`#modePizza`, `#resetParams` e `#resetChecks`, de modo que o `map` do `app.js` funcione sem mudar;
  - a seção Agenda contém `#timeline`, `#schedWarn` e o resumo;
  - a seção "Receita completa" é um link para `#mise` que fecha o diálogo, sem duplicar a tabela.
- Botão da barra com o resumo `barSum`. Abertura e diálogo sincronizados nos dois sentidos.
- Horário do cronograma em cada cartão (`data-when` pelo `ev`) e selo "agora". Interlúdios com "faltam …". `#nextEv` na abertura.
- "Feito" + trilho + doca + `#idx` + contador + filete de progresso. O `updateProgress` que existe hoje é adaptado (sem `#progTxt`, que sai junto com a barra antiga).
- Timer no cartão `timer: true`, com o código atual adaptado para acumular tempo (como no protótipo: `acc + (performance.now() - t0)`):
  - anel e pizza na cena, mini-timer na barra quando o cartão do timer está fora da vista;
  - Wake Lock, reobtido em `visibilitychange`;
  - `aria-live` só nas trocas de faixa.
- Epílogo:
  - diagnóstico (chips e "aplicar", o código atual);
  - regras, glossário, Sobre;
  - galeria `photos.gallery` com `figure()` lazy e crédito;
  - "Voltar à pergunta inicial";
  - link "Como saiu?" no cartão do timer.
- Troca de receita levando o número de pizzas (4.2). Interruptor de movimento (`np-ui`).

**Verificar:**
- `cdp.mjs func` (critérios 11 a 13) e `kb` (14);
- capturas do diálogo aberto em 375 e 1440, do timer parado em 85 s (gancho de QA `?np-t=85`, que só funciona fora do pré-render) e do epílogo;
- Lighthouse, se estiver disponível, é opcional.

### E5 · New York (≈ 8 h)
- Estados exclusivos:
  - `bowl/rest`, `slab/knead`, `tray/pots` e `tray/pots-temper`;
  - `fridge/pots`;
  - `sauce/ny`, com molho liso, muçarela ralada, orégano e parmesão;
  - `oven/bake` com anel de 480 s e marcas por minuto, gerado pelo build a partir de `timer`;
  - a composição `slice`.
- Saco "Manitoba" e pote de açúcar entram como blocos `<!--if:new-york-->` e `<!--if:sugar-->` em `bench/mise`.
- Ligar o `journey` da NY (3.5), com as etiquetas próprias (`knead`, `rim`).

**Verificar:**
- `leak_check` passa;
- os 15 ladrilhos da NY estão sem `pending`;
- `shots`/`checks` em `/pt/new-york/`;
- o timer da NY tem faixas 60–90 s e 300–420 s.

### E6 · Inglês (≈ 3 h)
- Substituir todo `[EN]` provisório.
- Revisar as etiquetas em inglês: a largura do texto muda, então conferir o critério 8 (etiquetas inteiras) em `/en/` e `/en/new-york/`.
- Conferir `lang`, `hreflang` e o menu de idioma.

**Verificar:** `grep -rn "\[EN\]" src` vazio. `checks` em `/en/` e `/en/new-york/`. O JSON-LD em inglês é igual ao da linha de base.

### E7 · Movimento reduzido, sem JS, estático (≈ 2 h)
- Ajustar o modo estático: `content-visibility` nas figuras estáticas e nas seções do epílogo; panetti e anel no estado final.
- Abrir com JS desligado (CDP `Emulation.setScriptExecutionDisabled`).

**Verificar:** critério 13. Sem JS, as etapas aparecem em ordem com texto e números do pré-render, sem nada quebrado visualmente.

### E8 · Remoção do legado (≈ 2 h)
- Tudo da tabela 3.1, na ordem:
  1. `git rm -r docs/img/scene src/photos/scene src/scene.js src/player.js src/player-stage.svg src/illustrations.js`;
  2. apagar as funções e constantes do `build.py`;
  3. apagar as chaves de texto sem uso, guiado pela validação "chave não usada";
  4. apagar `recipe.json › scene/scenes`;
  5. apagar os campos de `photos.json`;
  6. atualizar a docstring do `build.py`, o README (seções "Como editar", "Nova receita" com `journey` e cenas, "Cenas (ilustração)" e "Pendências") e o comentário do `.gitignore`.
- Rodar `python3 build.py --images` só se a lista `PIZZAS` mudar. Ela não deve mudar.

**Verificar:**
- `grep -rni "gsap\|scene.js\|img/scene\|player\|manifest\|TAKES" src build.py docs --include=*.html --include=*.py --include=*.js --include=*.json` não encontra nada que não seja intencional;
- `du -sh docs` caiu cerca de 4,4 MB;
- `ok`, e o critério 2 continua valendo.

### E9 · QA completa (≈ 4 h)
- Rodar `cdp.mjs shots`, `checks`, `perf`, `func` e `kb` em todas as combinações de 6.2, mais 360×640 e 1920×1080.
- Corrigir o que falhar e repetir.
- Gravar as medições (LCP, CLS, longtasks, contraste, KB de SVG por página, peso do HTML gzip com `gzip -c docs/pt/index.html | wc -c`, meta ≤ 90 KB) em `03-implementacao.md`, com a lista do que não foi testado (Safari/iOS, Firefox, aparelho real, leitor de tela).

### E10 · Revisão e entrega
- Uma auditoria independente aplica os critérios de 6.1 em sessão própria.
- Corrigir os P0 e P1 apontados.
- Só então o dono decide o merge para `main`.

---

## Anexo A · Detalhes que costumam dar errado
1. **Placeholders do template**: o assert `chaves ausentes` pega `{{…}}` sem valor. Chave i18n usada no template precisa existir em `html` nos dois idiomas.
2. **`merge()`** é recursivo para dicts. Um `tag` definido na receita sobrepõe só as chaves que declara.
3. **`esc()` antes de `kspan`**: os textos das etapas não têm HTML (conferido). Escape primeiro e depois troque `{k}`. Para dicas, o prefixo `warn|` vira a classe `tip warn`.
4. **`tag.time`**: o tempo da etapa (`~{outh} h fora`) também passa por `kspan`. O mecanismo `data-tpl`/`${k}` do `render()` atual deixa de ser necessário: remova-o e deixe só `[data-k]`.
5. **`#altRow`, `#warnBox` e `#panelSum`** existem só uma vez (mise e diálogo). `#panelSum` sai, substituído por `#barSum`.
6. **Datas no pré-render**: `renderSchedule` roda no pré-render e preenche `#timeline`. As trocas que já existem no `prerender()` limpam `#timeline`, `#nextEv` e `#schedWarn`: mantenha-as e acrescente `data-when`.
7. **`history.replaceState`**: não usar com hash na rolagem (4.3).
8. **iOS e `100lvh`**: o palco do desktop usa `lvh`. O do mobile usa `svh` no cálculo de `--stage`, para ficar estável quando a barra de URL recolhe.
9. **`overflow-x`**: `body{overflow-x:clip}`, e não `hidden`, porque `hidden` cria contexto de rolagem e pode afetar o `sticky`. Mesmo assim, o critério 4 precisa passar sem depender disso.
10. **Fontes no SVG**: não há texto com palavras no SVG, então não há dependência de fonte dentro da arte.
