# 01 · Direção de arte — redesign imersivo do NapoliProtocol

Conceito escolhido: **"Luce di Forno"** — um cenário fotográfico fixo (a pizza na mesa, em claro-escuro) sobre o qual deslizam folhas editoriais sólidas com as ferramentas. Híbrido de *Immersive Editorial* (base) com *Cinematic Scroll* só no herói e nas aberturas de capítulo.

Mockup estático de referência: `design/mockup/index.html`. Abrir por um servidor na raiz do repositório (`python3 -m http.server 8767` e depois `/design/mockup/index.html`). Mostra só a napolitana, com `src/photos/*-1400.jpg` (logo, mais mole do que o final), números fixos e o player representado por um quadro parado. O botão ◐ alterna o tema.

Leitura prévia: `design/00-diagnostico.md`.

---

## 1. Leitura crítica do site atual

- **O herói não tem imagem sem WebGL.** A única fotografia real aparece dentro das etapas e no Sobre; acima da dobra há um objeto 3D procedural de ~600 KB que, em aparelho fraco, vira texto puro.
- **Parece painel de aplicativo, não um ofício.** Cartões brancos de raio 20 px empilhados sobre fundo neutro; as seções não se relacionam entre si nem com a comida.
- **Há duas demonstrações disputando o mesmo papel.** O palco 3D esconde o player SVG (`.has-3d`), que é mais leve, acessível e já recalcula as quantidades.
- **No celular o 3D atrapalha a ferramenta.** Palco sticky de 44vh sobre as etapas rouba metade da tela justamente quando a pessoa está com a mão na massa.
- **Dois arquivos de tokens se sobrepõem** (`style.css` com Young Serif/Figtree e `style-3d.css` com Bricolage/Atkinson); o player tem um terceiro conjunto próprio.
- **O que funciona e fica:** a calculadora que recalcula tudo, o cronograma de trás para a frente, o "próximo evento", o timer com faixas, o diagnóstico com "aplicar", números em mono tabular, modo escuro por horário.

---

## 2. Três conceitos comparados

### (a) Cinematic Scroll Journey
- **Conceito:** a foto é um plano-sequência. O scroll move uma câmera (zoom e panorâmica esfregados quadro a quadro) e o conteúdo entra em cena como legendas.
- **Navegação:** trechos longos com a cena presa (sticky de 300–500vh) entre os blocos de conteúdo; a pessoa "assiste" antes de chegar à ferramenta.
- **Viabilidade:** média. Exige esfregar transformações por scroll (CSS scroll-driven só em Chromium e Safari recente; no restante, JS em cada quadro). Tabela, timer e cronograma não cabem em cena: ficam para depois do filme.
- **Impacto visual:** o mais alto na primeira visita.
- **Limitações:** quem volta no dia 2 para marcar a etapa 5 atravessa o filme de novo; âncoras da nav caem no meio de trechos presos; o zoom profundo esbarra na resolução (ver §7); página muito mais longa.
- **Acessibilidade:** a pior das três. Movimento contínuo ligado ao scroll (vestibular), texto sobre imagem em movimento, ordem de leitura dependente de posição; a versão reduced-motion vira outro site.
- **Desempenho:** camada grande transformada a cada quadro, imagens de 3840 px obrigatórias; risco de INP e de travar em Android intermediário.

### (b) Immersive Editorial Experience
- **Conceito:** revista de gastronomia. Fotografia de página inteira no herói e nas aberturas de capítulo; entre elas, páginas sólidas com tipografia editorial e as ferramentas.
- **Navegação:** scroll nativo, sem trechos presos. Âncoras previsíveis. Cada capítulo abre com uma imagem e um título.
- **Viabilidade:** alta. `<picture>`, CSS e um observador de interseção. O conteúdo atual encaixa sem reescrever a lógica.
- **Impacto visual:** alto e duradouro; menos "uau" do que (a), porém sem cansar no uso repetido.
- **Limitações:** se cada capítulo usar uma foto solta, perde-se a sensação de ambiente contínuo; depende da qualidade do acervo (hoje desigual).
- **Acessibilidade:** a melhor. Texto de trabalho sempre sobre superfície sólida; movimento opcional.
- **Desempenho:** o melhor. LCP é uma imagem pré-carregada; nada roda por quadro.

### (c) Visual Storytelling Landscape
- **Conceito:** uma paisagem única (a bancada vista de cima, ou um panorama longo) em que cada seção ocupa um lugar: ingredientes aqui, forno ali.
- **Navegação:** a página percorre a paisagem; o conteúdo fica ancorado em pontos da cena.
- **Viabilidade:** baixa com o acervo atual. Não existe foto panorâmica; seria preciso compor ou encomendar. Conteúdo preso a pontos da imagem quebra a cada proporção de tela.
- **Impacto visual:** alto se a imagem existir; frágil se for montagem.
- **Limitações:** tabela de 5 colunas, 13 etapas com checkbox e timer não podem ficar "soltos na cena"; duas receitas exigem duas paisagens; mobile vira outra composição inteira.
- **Acessibilidade:** média para baixa. Contraste varia conforme o trecho da imagem atrás de cada bloco.
- **Desempenho:** médio. Imagem enorme (altura de várias telas) ou vários ladrilhos.

### Tabela comparativa (1 = pior, 5 = melhor)

| Critério | (a) Cinematic Scroll | (b) Immersive Editorial | (c) Storytelling Landscape | **Híbrido escolhido** |
|---|---|---|---|---|
| Serve à ferramenta em uso (dia 2, mão suja) | 2 | 5 | 2 | **5** |
| Impacto na primeira visita | 5 | 4 | 4 | **4,5** |
| Sensação de ambiente contínuo | 5 | 3 | 5 | **4** |
| Viabilidade com as fotos existentes | 3 | 5 | 1 | **5** |
| Acessibilidade (contraste, movimento, teclado) | 2 | 5 | 3 | **5** |
| Desempenho (LCP, INP, bytes) | 2 | 5 | 3 | **4,5** |
| Mobile com enquadramento próprio | 3 | 5 | 2 | **5** |
| Duas receitas, dois temas | 3 | 5 | 2 | **5** |
| Custo de implementação | 2 | 5 | 1 | **4** |

---

## 3. Escolha justificada

**Híbrido: (b) como arquitetura, com a câmera de (a) restrita ao herói e às aberturas de capítulo. (c) descartado.**

1. **O site é uma ferramenta de bancada com capa bonita, não o contrário.** Cerca de 80% da altura da página é calculadora, cronograma, etapas e timer, usados em três dias diferentes, com retorno por âncora e, muitas vezes, com o celular apoiado na bancada. Qualquer conceito que coloque trechos presos entre a pessoa e a etapa 9 falha no objetivo real.
2. **A continuidade vem de uma decisão de arquitetura, não de animação:** a foto fica **fixa atrás de tudo** (`position: fixed`) e as superfícies de trabalho são folhas opacas que deslizam por cima. Entre uma folha e outra há uma "janela" em que o mesmo cenário reaparece em outro enquadramento. A pessoa sente que nunca saiu da mesa, e nada disso sequestra o scroll.
3. **A profundidade vem de camadas e luz, não de 3D:** cenário fixo, véu (scrim) que acompanha a seção, folha com sombra projetada no cenário, tipografia grande por cima. Três planos reais com velocidades diferentes, sem paralaxe artificial.
4. **A câmera é disparada, não esfregada.** Ao entrar numa janela, o enquadramento muda com uma transição de 1,4 s. Quem rola depressa não fica preso; quem rola devagar vê o movimento. Um único trecho esfregado (o leve avanço do herói) entra como melhoria progressiva.
5. **Respeita os limites do acervo.** A `oro` (5712 px, CC0) aguenta os enquadramentos pedidos; nenhuma tomada exige mais nitidez do que a fonte tem (§7). `napoli` (2102 px) e `dough` (foto doméstica, com marca no tapete) ficam fora do cenário.
6. **(c) não se sustenta:** não há imagem panorâmica, e conteúdo ancorado em pontos da cena é incompatível com tabela, checkbox e timer.

Custo assumido: o impacto é um pouco menor que o de um filme de scroll completo. Em troca, a página continua rápida, legível e utilizável nos dois temas.

---

## 4. Direção de arte e conceito visual

**Nome:** Luce di Forno (luz de forno).

**Ideia:** a boca de um forno a lenha é a única fonte de luz; o que está perto dela brilha, o resto afunda na sombra. A fotografia é tratada assim: a pizza acesa de um lado, dissolvendo em carvão do outro, e o texto mora na sombra.

**Mood:** jantar tardio, mesa de madeira, silêncio de cozinha depois do serviço. Quente, denso, sem enfeite. Editorial de gastronomia, não cardápio.

**Luz:** lateral e quente (a `oro` já tem sol rasante vindo da direita e sombra dura no canto superior esquerdo). O véu reforça essa direção: escuro à esquerda e embaixo, aberto à direita e em cima. Nunca vinheta simétrica.

**Dois ambientes de superfície, um só cenário:**
- **Cena** (tudo que fica sobre a foto): sempre escura, nos dois temas. Texto creme sobre carvão.
- **Folhas** (ferramentas): tema claro "Farinha" (papel quente) ou tema escuro "Brasa" (carvão morno).

**Paleta-conceito:** carvão `#120E0C`, farinha `#F4EEE4`, pomodoro `#C2321A`, ouro de forno `#E9B872` (só na cena: pílulas, itálicos do título), manjericão `#2B6E44` (concluído), brasa `#8A4E0C` (tempo, dicas), frio `#2B6490` (geladeira).

**Duas receitas, dois climas dentro da mesma família:**

| | Napolitana | New York |
|---|---|---|
| Foto do herói | `oro` (pizza inteira, mesa de madeira, sol rasante) | `nyslice` (duas fatias, papel xadrez, luz do dia) |
| Clima (`scene.mood`) | `brasa`: sombra profunda, ouro | `meio-dia`: mais claro, xadrez vermelho como textura |
| Véu do tema claro | padrão | +8% de densidade (a foto tem áreas quase brancas) |
| Título da cena final | "Farinha, água, sal, tempo." | "Dobre ao meio. Coma em pé." |

A `nyslice` é a foto mais fraca do par: tem uma lata de cerveja com marca e carros ao fundo. O enquadramento abaixo corta a faixa superior da imagem. Se aparecer uma foto melhor de New York (fatia única, fundo limpo, ≥ 4000 px, CC0/BY), basta trocar a chave em `recipe.json`.

---

## 5. Layout por seção

Grade: 12 colunas, largura máxima 1240 px, calha lateral `clamp(16px, 4vw, 56px)`, intervalo de 32 px (16 px no mobile). Ponto de quebra principal: **820 px**. Segundo ponto: 1100 px (colunas fixas viram empilhadas onde indicado).

Ordem da página (ids preservados): herói → `#receita` → janela II → `#cronograma` → janela III → `#assistir` + `#passos` → janela IV → `#forno` → `#regras` → `#sobre` → cena final (rodapé).

### 5.1 Herói

Desktop (≥ 821 px): 100svh, mínimo 640 px. Texto na coluna esquerda (máx. 600 px), alinhado embaixo. A pizza fica à direita, com o centro em 64% da largura, sangrando para fora pela direita e dissolvendo em carvão pela esquerda.

```
┌──────────────────────────────────────────────────────────────────────┐
│ NapoliProtocol        Receita Cronograma Passos Forno …   5/13 ◐ PT │  topbar transparente
│                                                                      │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒▒▒▒░░░░░        ╭───────────────╮            │
│ [Napolitana | New York]            ╭───╯   pizza        ╰───╮        │
│ (CAPUTO 00 · PRÉ-FERMENTO)        │     centro em 64% × 52%  │──▶ sangra
│ Protocolo da Pizza                 ╰───╮                 ╭───╯        │
│ Napolitana                             ╰───────────────╯             │
│ Feita à mão em três dias…                                            │
│ por Jhonathan Sousa · v1.0                                           │
│ [Pizzas  −  5  +   800 g · 270 g]              Foto: S. Stierch, CC0 │
├─╭──────────────────────────────────────────────────────────────────╮─┤  folha I sobe por cima
│ │ MASSA TOTAL │ PANETTI   │ FORNO SUPERIOR │ FORNO INFERIOR         │ │  faixa de KPIs cavalga
└─┴──────────────────────────────────────────────────────────────────┴─┘  a borda (−64 px)
```

Mobile (≤ 820 px): 100svh. Texto no topo sobre carvão; a foto ocupa os 2/3 inferiores, em "meia-lua" (metade esquerda da pizza, borda em arco), com o topo dissolvendo no carvão. Seletor de pizzas preso embaixo, largura total. KPIs saem do herói e viram a primeira linha da folha I (2 × 2).

```
┌───────────────────────┐
│ NapoliProtocol 5/13 ◐ │
│ [Napolitana|New York] │
│ (CAPUTO 00 · 3 DIAS)  │
│ Protocolo da          │   texto: 0–50% da altura
│ Pizza Napolitana      │
│ Feita à mão em três…  │
│ por Jhonathan Sousa   │
│░░░▒▒▒▓▓ dissolve ▓▓▒▒░│   foto começa em 34%
│    ╭──────────────    │
│  ╭─╯  meia-lua da     │   sujeito: 50–90% da altura
│ ╭╯    pizza           │
│ ╰╮                    │
│ [Pizzas   −   5   + ] │   a 56 px do fim
│ Foto: S. Stierch, CC0 │
└───────────────────────┘
```

Regras do herói:
- `h1` em duas ou três linhas; a palavra que distingue a receita ("Napolitana", "New York") em itálico, na cor ouro.
- A pílula do topo (`hero.eyebrow`) tem fundo sólido carvão. Texto pequeno nunca fica direto sobre a foto.
- O link "próximo evento" (`#nextEv`), quando existe, aparece como segunda pílula sólida abaixo da assinatura.
- Crédito da foto: canto inferior direito (desktop) ou inferior esquerdo (mobile), pílula com fundo carvão a 78%.

### 5.2 Receita e calculadora (`#receita`, capítulo I · A massa)

Primeira folha, cantos superiores de 28 px e sombra projetada sobre o cenário. Abre com a faixa de KPIs.

Desktop: cabeçalho de capítulo (número + `h2` à esquerda, subtítulo à direita, fio embaixo). Depois, duas colunas: painel de parâmetros de 320 px, **sticky dentro deste capítulo** (`top: 84px`), e à direita a tabela, os três cartões (água, divisão, coberturas) e os alertas.

```
│ I · A MASSA                    Percentuais de padeiro sobre…  │
│ Receita                                                       │
│───────────────────────────────────────────────────────────────│
│ ┌ Parâmetros ───┐  ┌ Ingrediente      %   Total  Pré  Final ┐ │
│ │[Farinha|Pizzas]│  │ Farinha 00     100   800 g  400   400 │ │
│ │ Farinha  [800]g│  │ Água            64   512 g  400   112 │ │
│ │ Panetto  [270]g│  │ …                                     │ │
│ │ Hidrat.  [ 64]%│  │ MASSA               1.348 g  801   —  │ │
│ │ … (sticky)     │  └───────────────────────────────────────┘ │
│ └────────────────┘  [Água] [Divisão] [Coberturas]             │
```

Mobile: painel recolhido com resumo de uma linha (`panelSum`) e botão "Ajustar", como hoje; aberto, mostra os campos em uma coluna, com entradas de 48 px de altura. Tabela com cabeçalhos curtos (`.short`), primeira coluna quebrando linha, sem rolagem horizontal na napolitana de 5 colunas até 360 px (fonte 15 px, respiro 12/14).

Fora do capítulo I, o acesso aos parâmetros é o item "Receita" da nav e o link "Ajustar" dentro do resumo do herói; não há painel flutuante sobre as outras seções.

### 5.3 Cronograma (`#cronograma`, capítulo II · O tempo)

Precedido pela janela II. Folha com os quatro cantos arredondados (o cenário aparece acima e abaixo).

- Controles (data e hora de assar, horas de pré-fermento, geladeira, fora da geladeira) em uma linha no desktop, 2 × 2 no mobile.
- Linha do tempo: coluna de hora (120 px, mono, alinhada à direita), ponto colorido (trabalho, frio, quente), descrição. O **próximo evento** ganha anel no ponto, título na cor de destaque e o texto "em 5 h 10".
- Mobile: coluna de hora com 86 px.

### 5.4 Assista e passo a passo (`#assistir` + `#passos`, capítulo III · O gesto)

O player SVG assume o lugar do palco 3D.

Desktop (≥ 1100 px): duas colunas 5/6. À esquerda, o player **sticky** (`top: 84px`, altura máxima `calc(100svh - 108px)`). À direita, as etapas agrupadas por dia.

```
│ III · O GESTO                 Marque cada etapa ao concluir…  │
│ Passo a passo                                                 │
│───────────────────────────────────────────────────────────────│
│ ┌ player (sticky) ─────┐   Dia 2  mistura e divisão           │
│ │  [cena SVG 16:10]    │   ┌ ETAPA 02  Mistura inicial  [✓] ┐ │ concluída: 62% opac.
│ │  ▬▬▬▬▬▬▬▬▬▬▬▬▬ caps  │   ┌▌ETAPA 04  Bassinage        [ ] ┐ │ em foco: fio à esq.
│ │  DIA 2 · Bassinage   │   │  8–10 min · receita base       │ │
│ │  • Junte os 18 g…    │   │  • Adicione 18 g de água…      │ │
│ │  ‹  ▶  ›   Filme|Banc│   └────────────────────────────────┘ │
│ └──────────────────────┘   ┌ ETAPA 05  Desenvolver o glúten ┐ │
```

Sincronia: os dois modos que o player já tem ganham significado claro.
- **Bancada** (padrão quando a seção entra na tela): o player mostra a cena da etapa em foco na coluna da direita (a etapa cujo topo cruzou 40% da altura do viewport). Mapa etapa → cena: `scenes` do `recipe.json`, que já existe.
- **Filme**: toca as cenas em sequência e ignora o scroll. Ao apertar play, o modo muda para Filme; ao rolar mais de 1,5 viewport, volta para Bancada.

Para isso, `player.js` precisa expor `NP.player = { go(i, autoplay), indexOf(stepId), mode }` (hoje `go` é interno).

As ilustrações estáticas de cada etapa (`.illo`) ficam ocultas a partir de 1100 px (o player ao lado as substitui) e visíveis abaixo disso.

Mobile e tablet (< 1100 px): o player fica **no fluxo**, no topo do capítulo, largura total, sem sticky. Cada etapa tem um botão "▶ Ver gesto" (44 px) que rola até `#assistir` e chama `NP.player.go(cena)`. O botão "Concluído" ocupa a largura total do cartão.

Fotos reais das etapas (`photos.steps`) continuam dentro do cartão da etapa, com legenda e crédito.

### 5.5 Forno (`#forno`, capítulo IV · O fogo)

Precedido pela janela IV (`leopard`).

- **Timer:** único cartão da folha que é **sempre escuro** nos dois temas (carvão, texto creme), para ser lido a dois metros com o forno aceso. Relógio em mono de `clamp(72px, 11vw, 148px)`. Trilho de 18 px com a faixa "girar" em ouro e a faixa "ponto" em verde; marcador creme. Botões de 52 px.
- **Diagnóstico:** chips de 44 px; resposta em caixa `surface-2` com o botão "Aplicar".
- Desktop: 6/5 colunas. Mobile: timer primeiro, largura total.

### 5.6 Regras e glossário (`#regras`, capítulo V · O ofício)

Sem janela antes: apenas 20 px de cenário visível entre as folhas, para manter o ritmo sem alongar a página.

- Regras em duas colunas, cada uma com numeral itálico grande (Fraunces 34 px, cor de destaque) e fio superior; sem cartão.
- Glossário em `dl` de duas colunas, termo em serifa 600, definição em corpo.
- Mobile: uma coluna.

### 5.7 Sobre (`#sobre`, capítulo VI · A origem)

Mesma folha das regras.

- Página de revista: foto principal 7 colunas (proporção 3:2, raio 22 px, legenda e crédito embaixo), texto 5 colunas com capitular na primeira letra.
- Demais fotos (`photos.about`) em fileira de 2 ou 3, mesma proporção.
- Fatos (`ABOUT_FACTS`) como faixa de números em mono, separados por fios, sem cartão.
- Mobile: foto, texto, fotos em carrossel de rolagem horizontal nativa com `scroll-snap`.

### 5.8 Cena final e rodapé

O cenário volta ao plano aberto do herói, mais escuro. Altura 72svh (60svh no mobile). Frase de fecho em itálico grande; abaixo, numa linha com fio: assinatura, Instagram, receitas, idiomas, créditos das fotos de fundo e direitos. Tudo em creme sobre véu ≥ 72%.

---

## 6. Design system

Uma única fonte de tokens em `src/style.css`; `src/style-3d.css` deixa de existir. O bloco `.np-player{--card…}` passa a herdar destes tokens.

### 6.1 Cor

**Cena (sobre a foto; igual nos dois temas)**

| Token | Hex | Uso | Contraste sobre `--scene` |
|---|---|---|---|
| `--scene` | `#120E0C` | cor do véu, fundo de pílulas, timer | — |
| `--scene-ink` | `#FFF7EA` | todo texto sobre a foto | 18,1 |
| `--scene-muted` | `#D9CBB8` | texto secundário, só sobre pílula sólida | 12,1 |
| `--oro` | `#E9B872` | pílulas, itálico do título, foco na cena | 10,6 |

**Folhas**

| Token | Claro "Farinha" | Escuro "Brasa" | Uso |
|---|---|---|---|
| `--bg` | `#F4EEE4` | `#120E0C` | fundo da folha |
| `--surface` | `#FFFCF6` | `#1D1815` | cartões, tabela, topbar sólida |
| `--surface-2` | `#EBE3D5` | `#29221E` | linha de total, segmentado, saída do diagnóstico |
| `--ink` | `#1B1512` | `#F4EDE3` | texto |
| `--muted` | `#5F554C` | `#B5A99C` | texto secundário, rótulos |
| `--line` | `#DDD3C3` | `#3A312B` | fios decorativos |
| `--line-strong` | `#8F8375` | `#7A6C60` | borda de input, botão, chip (≥ 3:1) |
| `--accent` | `#C2321A` | `#F26A47` | botão primário, ponto "trabalho", fio da etapa em foco |
| `--accent-ink` | `#9E2613` | `#F26A47` | texto em destaque, numerais |
| `--accent-soft` | `#F7DDD3` | `#3A1E16` | fundo de alerta |
| `--on-accent` | `#FFFFFF` | `#1A0B06` | texto sobre `--accent` |
| `--basil` / `-soft` | `#2B6E44` / `#DCEBDD` | `#74C08D` / `#1C2D22` | concluído, faixa "ponto" |
| `--ember` / `-soft` | `#8A4E0C` / `#F5E6CC` | `#EBAA5E` / `#35281A` | tempo, dica, ponto "quente" |
| `--cold` | `#2B6490` | `#86B6DC` | geladeira |

Contrastes calculados (WCAG 2.x):

| Par | Claro | Escuro |
|---|---|---|
| `ink` sobre `bg` / `surface` | 15,7 / 17,6 | 16,5 / 15,1 |
| `muted` sobre `bg` / `surface` / `surface-2` | 6,3 / 7,1 / 5,7 | — / 7,6 / 6,8 |
| `accent` sobre `surface` / `bg` | 5,5 / 4,8 | 5,8 / 6,3 |
| `on-accent` sobre `accent` | 5,6 | 6,3 |
| `accent-ink` sobre `accent-soft` | 5,9 | — |
| `basil` sobre `surface` / `basil-soft` | 6,0 / 5,0 | 8,1 / — |
| `ember` sobre `surface` / `ember-soft` | 6,5 / 5,4 | 8,8 / — |
| `cold` sobre `surface` | 6,2 | 8,2 |
| `line-strong` sobre `surface` (borda de controle) | 3,6 | 3,5 |

Os pares marcados "—" não foram calculados; verificar na implementação antes de usar.

### 6.2 Tipografia

| Papel | Família (Google Fonts) | Motivo |
|---|---|---|
| Display | **Fraunces** (variável: `opsz` 9–144, `wght` 300–700, itálico) | Serifa "old style" de traço robusto: segura contraste sobre fotografia, onde uma didone fina se perde. Tem itálico expressivo para a palavra-chave do título e eixo óptico que afina o desenho em tamanhos grandes. Dá o tom editorial que a grotesca atual (Bricolage) não dá. |
| Texto e interface | **Atkinson Hyperlegible Next** (variável, 400–700) | Mantém a legibilidade de bancada da Atkinson atual (formas inequívocas a distância e com tela suja) e acrescenta os pesos 500/600 que faltavam para rótulos e botões. |
| Números | **JetBrains Mono** (400, 600) | Mantida. Tabular, zero cortado, já usada pelo player SVG. |

Carregamento: um único `<link>` com `display=swap`; `preconnect` como hoje. Pilhas de reserva: `Georgia, "Times New Roman", serif` / `"Atkinson Hyperlegible", Verdana, sans-serif` / `ui-monospace, Menlo, monospace`.

Escala (desktop → mobile):

| Token | Tamanho | Peso | Entrelinha | Tracking | Uso |
|---|---|---|---|---|---|
| `--t-hero` | `clamp(44px, 7vw, 108px)` | 560 | 0,94 | −0,025em | `h1` |
| `--t-scene` | `clamp(40px, 7vw, 104px)` | 500 | 0,95 | −0,025em | título de janela |
| `--t-chap` | `clamp(34px, 4.6vw, 64px)` | 520 | 1,0 | −0,02em | `h2` de capítulo |
| `--t-h3` | 28 → 24 px | 560 | 1,1 | −0,01em | dia, título do player |
| `--t-h4` | 22 → 20 px | 560 | 1,15 | 0 | título de etapa, cartão |
| `--t-lead` | `clamp(17px, 1.5vw, 20px)` | 400 | 1,5 | 0 | lead, texto de janela |
| `--t-body` | 17 → 16,5 px | 400 | 1,55 | 0 | corpo |
| `--t-ui` | 15 px | 500/600 | 1,3 | 0 | rótulos de campo, botões, nav |
| `--t-small` | 13,5 px | 400 | 1,45 | 0 | legendas, notas |
| `--t-eyebrow` | 11,5 px | 600 | 1 | 0,12em, caixa alta | rótulo de cartão, `th` |
| `--t-num-xl` | `clamp(72px, 11vw, 148px)` mono | 600 | 1 | −0,04em | relógio do timer |
| `--t-num-l` | 26 → 20 px mono | 600 | 1,2 | 0 | KPI |
| `--t-num` | 16 px mono | 400/600 | — | 0 | tabela, valores |

Regras: itálico da Fraunces só para ênfase de uma a três palavras; nunca texto corrido em itálico. Medida máxima de leitura: 60ch (corpo), 46ch (lead sobre imagem). `text-wrap: balance` em títulos.

### 6.3 Espaçamento, raios, sombras, movimento

- **Espaço** (base 4): `4, 8, 12, 16, 24, 32, 48, 64, 96, 128`. Respiro interno de cartão 20–24 px; entre cartões 12–16 px; cabeçalho de capítulo 56/28 px (36/20 no mobile); fim de folha 88 px (56 no mobile).
- **Raios:** `--r-s: 8px` (input, dica), `--r-m: 14px` (caixas internas), `--r-l: 22px` (cartões), `--r-sheet: 28px` (folhas), `99px` (pílulas, botões, chips).
- **Sombras:** `--sh-sheet: 0 -24px 60px -20px rgb(18 14 12 / .55)` (escuro: `rgb(0 0 0 / .8)`); `--sh-card: 0 1px 0 rgb(18 14 12 / .04), 0 14px 30px -22px rgb(18 14 12 / .35)`; no tema escuro, cartão sem sombra e com `0 0 0 1px var(--line)`.
- **Curvas:** `--ease-cam: cubic-bezier(.22,.61,.36,1)` (câmera), `--ease-ui: cubic-bezier(.2,.8,.2,1)` (interface).
- **Alvos de toque:** mínimo 44 × 44 px; ações de bancada (timer, +/− pizzas) 48–52 px.
- **Foco:** `outline: 3px solid` em `--oro` na cena e `--accent` nas folhas, deslocado 3 px.

### 6.4 Componentes

| Componente | Especificação |
|---|---|
| **Topbar** | Fixa, 60 px (56 no mobile). Sobre o herói: transparente, texto creme, véu superior de 96 px por baixo. Depois de `scrollY > 100svh − 70px`: `surface` a 92% + blur 10 px, texto `ink`, fio inferior. Transição 250 ms. Conteúdo: marca com bandeira, nav (oculta ≤ 900 px), progresso `n/N` + barra de 56 × 4 px em ouro, tema, idioma. |
| **Abas de receita** | Segmentado em pílula, fundo carvão 82%, ativa em creme com texto carvão. |
| **Pílula de cena** | Mono 12 px, caixa alta, ouro sobre carvão sólido, borda ouro a 40%. Usada para `hero.eyebrow` e número de capítulo nas janelas. |
| **Botão** | Altura 52 (bancada) / 44 (interface). Pílula. Primário: `accent` + `on-accent`. Secundário: transparente + borda `line-strong`. Pressionado: `scale(.97)` 80 ms. Desabilitado: 50% de opacidade. |
| **Input numérico** | 44 px (48 no mobile), 118 px de largura, borda 1,5 px `line-strong`, fundo `bg`, valor em mono 600 à direita, unidade em `muted`. Foco: borda `accent` + halo de 3 px a 25%. |
| **Segmentado** | Trilho `surface-2`, opção ativa `ink` com texto `bg`, 40 px. |
| **Cartão** | `surface`, raio 22, `--sh-card`. Sem borda no claro. |
| **Faixa de KPIs** | Um cartão único dividido em 4 por fios; rótulo eyebrow, valor mono 26 px, apoio 13,5 px. Desktop: sobe 64 px sobre a borda da folha. |
| **Cabeçalho de capítulo** | Número em mono (`I · A massa`) na cor `accent-ink`, `h2` em Fraunces, subtítulo `muted` à direita, fio inferior. |
| **Tabela** | `th` eyebrow; células 15 × 20 px; fios `line`; números em mono à direita; linha total em `surface-2`, peso 700. Sem zebra. |
| **Linha do tempo** | Grade 120 / 20 / 1fr; trilho de 2 px; ponto de 14 px com anel `surface`; próximo evento com anel `accent` a 35%. |
| **Etapa** | Cartão com fio esquerdo de 3 px (transparente; `accent` quando em foco). Número em mono, título Fraunces 22, etiquetas em pílula (`ember-soft` para tempo), lista, dica. Concluída: opacidade 62%, corpo recolhido ao título. |
| **Check "Concluído"** | Pílula 44 px com caixa de 20 px. Ativo: `basil-soft`, borda e texto `basil`, caixa preenchida. `aria-pressed`. |
| **Chip** | Pílula 44 px, borda `line-strong`; ativo: `ink` com texto `bg`. |
| **Dica / alerta** | Dica: `ember-soft` + `ember`. Alerta: `accent-soft` + `accent-ink`, com ícone. Raio 8. |
| **Timer** | Cartão carvão fixo nos dois temas; ver 5.5. |
| **Player** | Cartão; palco 16:10 com gradiente radial escuro (`#3A2E27 → #17120F`) nos dois temas; capítulos como barras de 6 px; legenda com quantidades em marca-texto ouro a 30%; controles 48/60 px. |
| **Figura** | Imagem com raio 22; `figcaption` 13,5 px `muted`: legenda + "Foto: autor, licença" com links (padrão atual de `figure()` no `build.py`). |
| **Crédito de cena** | Pílula 12 px, creme sobre carvão a 78%, mesmos links. |

### 6.5 Composição e legibilidade sobre imagem

1. **Texto de trabalho nunca fica sobre a foto.** Tabelas, campos, etapas, timer e diagnóstico vivem em folhas opacas.
2. **Sobre a foto só existem:** título, lead, assinatura (em creme) e pílulas sólidas.
3. **Véu mínimo sob qualquer texto creme: 62% de `--scene`.** Com isso o contraste é ≥ 5,0:1 mesmo se o pixel de baixo for branco puro (calculado: 0,60 → 4,75; 0,62 → 5,06; 0,72 → 7,4).
4. **Texto pequeno em ouro ou em `scene-muted` exige fundo sólido** (pílula). Sobre véu de 62% eles ficam em 3,0 e 3,4.
5. **O véu pertence à seção, não ao cenário:** fica no `::before` do herói e de cada janela e rola junto com o texto. O cenário recebe apenas o escurecimento global do tema (6.6).
6. **O véu tem direção:** denso onde está o texto (esquerda e base), aberto onde está o sujeito (direita e topo). Nas janelas do desktop é uma elipse ancorada no canto inferior esquerdo; no mobile, um gradiente vertical a partir da base.
7. **O sujeito nunca fica atrás do bloco de texto** no desktop: âncora da tomada à direita (x ≥ 62%).
8. **Nenhuma animação move texto sobre a foto** além da entrada única (§9).

### 6.6 Tratamento da imagem por tema

| | Claro | Escuro |
|---|---|---|
| Escurecimento global do cenário (`--bd-dim`, camada carvão) | 0 | 0,26 |
| Multiplicador do véu das seções (`--scrim-k`) | 1,00 (New York: 1,08) | 1,12 |
| Folhas | papel `#F4EEE4` | carvão `#120E0C` |
| Sombra da folha sobre o cenário | 55% | 80% |

Herói, desktop (da esquerda para a direita; `c` = calha + largura da coluna de texto): 0,96 em 0 → `0,86·k` em `c` → `0,66·k` em `c + 80px` → 0 em `c + 46vw`. Somado a um gradiente de base: 0,90 em 0 → 0 em 34% da altura. Os pontos são presos à coluna de texto, não a porcentagens do viewport, para que o texto esteja sempre na zona ≥ 0,66 em qualquer largura.

Herói, mobile (de cima para baixo): 0,98 em 0 → `0,86·k` em 50% → 0 em 70%; base: 0,92 → 0 em 18%. O bloco de texto precisa terminar antes de 50% da altura; em telas baixas o herói cresce além de 100svh em vez de sobrepor.

Janela, desktop: `radial-gradient(140% 130% at 0% 100%, 0,94 em 0, 0,70·k em 70%, 0,10 em 100%)`. Janela, mobile: vertical, 0,94 na base → `0,70·k` em 58% → 0 em 88%; o bloco de texto fica nos 58% inferiores.

Cena final: vertical, 0,96 → 0,72 em 55% → 0,30.

---

## 7. Estratégia da imagem principal

### 7.1 Fotos e papéis

| Chave | Original | Licença | Papel |
|---|---|---|---|
| `oro` | 5712 × 4284 | CC0 | **Cenário da napolitana:** herói, janelas II e III, cena final |
| `leopard` | 4000 × 3000 | CC BY-SA 4.0 | Cenário da napolitana: janela IV (O fogo) |
| `nyslice` | 4032 × 3024 | CC0 | **Cenário da New York:** herói, janelas II, III e IV |
| `nyfold` | 3024 × 4032 | CC BY-SA 4.0 | Cenário da New York: cena final (recorte paisagem no desktop, retrato no mobile) |
| `napoli` | 2102 × 1402 | CC BY 2.0 | Só em figura no Sobre (máx. 1400 px). Resolução insuficiente para cenário |
| `dough`, `pelati`, `peel`, `brandi`, `lombardi` | — | — | Só em figuras de etapa e do Sobre, como hoje |

Recortes e gradação de fotos BY-SA são obras derivadas: os arquivos gerados ficam sob a mesma licença, com autor, licença e link visíveis na própria janela.

### 7.2 Orçamento de nitidez

Regra: **`s × largura do viewport × min(DPR, 2) ≤ largura do arquivo servido`**, em que `s` é a escala da tomada (1 = a imagem cobre o viewport).

- Arquivo máximo servido: 3840 px. Em 1440 px a 2×: `s ≤ 1,33`. **Teto no desktop: `s = 1,30`.**
- Em 1920 px a 2× (raro) com `s = 1,30` a imagem fica a 77% da nitidez ideal; aceito, porque a tomada está sob véu.
- Fotografia é servida para no máximo 2× de densidade; telas 3× recebem o arquivo de 2×.
- Mudança de assunto maior do que isso é **corte com fusão para outra foto**, não zoom.

### 7.3 Modelo de câmera

Cada tomada é definida por: foco `(fx, fy)` em % da imagem **original**; âncora `(ax, ay)` em % do viewport (onde o foco cai); escala `s`; e `bleed` opcional (`l` ou `t`: a imagem pode deixar a borda esquerda ou superior descoberta, dissolvendo em carvão por máscara).

```
A  = largura/altura do original
W0 = max(vw, vh·A)      H0 = W0 / A          caixa "cover" em s = 1
W  = W0·s               H  = H0·s
tx = ax·vw − fx·W       ty = ay·vh − fy·H
sem bleed:  tx = clamp(vw − W, tx, 0)    ty = clamp(vh − H, ty, 0)
transform:  translate3d(tx, ty, 0) scale(s)     origem 0 0, elemento com W0 × H0
```

`vh` é a altura do cenário (`100lvh`), para o enquadramento não pular quando a barra do navegador móvel recolhe. Recalcular só em mudança de largura ou orientação.

O arquivo mobile é um recorte do original. Para manter um único sistema de coordenadas, a camada transformada é uma caixa virtual do original inteiro (`W0 × H0`), e o `<img>` do recorte é posicionado dentro dela em `left = x0·W0, top = y0·H0, width = w·W0, height = h·H0`. As tomadas mobile devem manter o viewport dentro do retângulo do recorte (o build valida).

### 7.4 Tomadas

Coordenadas em % do original. `s` relativo a "cover".

**Napolitana**

| Tomada | Foto | Desktop `f` → `a`, `s` | Mobile `f` → `a`, `s` | O que se vê |
|---|---|---|---|---|
| `hero` | `oro` | (45, 48) → (64, 52), 1,00, bleed `l` | (31, 100) → (50, 100), 0,66, bleed `t` | Desktop: pizza inteira à direita. Mobile: meia-lua esquerda, colada na base |
| `tempo` | `oro` | (56, 80) → (68, 38), 1,30 | (48, 82) → (50, 40), 1,00 | Borda inferior, bolhas chamuscadas (fermentação) |
| `gesto` | `oro` | (20, 56) → (70, 40), 1,30 | (18, 60) → (50, 40), 1,00 | Cornicione esquerdo, dobra da massa |
| `fogo` | `leopard` | (42, 74) → (68, 40), 1,12 | (40, 74) → (50, 40), 1,00 | Manchas de leopardo em primeiro plano |
| `fim` | `oro` | (45, 48) → (50, 42), 1,00 | (45, 50) → (50, 42), 1,00 | Plano aberto, centrado, mais escuro |

**New York**

| Tomada | Foto | Desktop `f` → `a`, `s` | Mobile `f` → `a`, `s` | O que se vê |
|---|---|---|---|---|
| `hero` | `nyslice` | (45, 67) → (62, 49), 1,15, bleed `l` | (42, 100) → (50, 100), 0,90, bleed `t` | Duas fatias sobre o xadrez. `s = 1,15` com base alinhada mostra y de 35% a 100%: a lata e a rua ficam fora |
| `tempo` | `nyslice` | (30, 62) → (68, 40), 1,30 | (30, 64) → (50, 40), 1,00 | Queijo com bolhas douradas da fatia esquerda |
| `gesto` | `nyslice` | (48, 60) → (70, 42), 1,30 | (46, 62) → (50, 40), 1,00 | O corte entre as duas fatias |
| `fogo` | `nyslice` | (74, 50) → (68, 40), 1,30 | (62, 50) → (50, 40), 1,00 | Borda tostada da fatia direita |
| `fim` | `nyfold` | (52, 56) → (50, 45), 1,00 | (52, 56) → (50, 45), 1,00 | A fatia no prato contra o céu |

Os valores da napolitana foram ensaiados no mockup com a versão de 1400 px; os da New York são estimados a partir da `nyslice-800.jpg` e precisam de ajuste fino de ±3 pontos na implementação. Critério de ajuste: sujeito fora do bloco de texto e nenhum elemento de marca legível (lata) na área sem véu.

### 7.5 Recortes mobile (`<picture>`)

| Foto | Retângulo no original (x0, y0, w, h em %) | Pixels | Proporção |
|---|---|---|---|
| `oro` | (0, 0, 70, 100) | 3998 × 4284 | 0,93 |
| `leopard` | (10, 0, 60, 100) | 2400 × 3000 | 0,80 |
| `nyslice` | (0, 30, 70, 70) | 2822 × 2117 | 1,33 |
| `nyfold` | original inteiro (retrato) | 3024 × 4032 | 0,75 |

No desktop, `nyfold` usa o recorte paisagem (0, 28, 100, 56) = 3024 × 2258.

```html
<picture>
  <source media="(max-width: 820px)" type="image/avif"
          srcset="/img/scene/oro-m-800.avif 800w, /img/scene/oro-m-1200.avif 1200w, /img/scene/oro-m-1600.avif 1600w"
          sizes="200vw">
  <source media="(max-width: 820px)" type="image/webp" srcset="…-m-800.webp 800w, …" sizes="200vw">
  <source type="image/avif"
          srcset="/img/scene/oro-1280.avif 1280w, /img/scene/oro-1920.avif 1920w, /img/scene/oro-2560.avif 2560w, /img/scene/oro-3840.avif 3840w"
          sizes="130vw">
  <source type="image/webp" srcset="…" sizes="130vw">
  <img src="/img/scene/oro-1920.jpg" width="1920" height="1440" alt="" decoding="async" fetchpriority="high">
</picture>
```

`sizes` é maior que 100vw de propósito: a imagem é exibida ampliada (até 1,30× no desktop; no mobile a caixa virtual tem ~1,33 × a altura do viewport).

### 7.6 Formatos, tamanhos e peso

| Variante | Larguras | Formatos | Teto de peso (AVIF) |
|---|---|---|---|
| Desktop 4:3 | 1280, 1920, 2560, 3840 | AVIF, WebP, JPG (só 1920) | 1920: 220 KB · 3840: 650 KB |
| Mobile (recorte) | 800, 1200, 1600 | AVIF, WebP, JPG (só 1200) | 1200: 140 KB · 1600: 220 KB |

- Qualidade inicial: AVIF `avifenc -q 52 -s 4` (4:2:0), WebP `cwebp -q 78`, JPG 80 progressivo. Ajustar para caber nos tetos; o véu tolera compressão mais forte.
- Geração no `build.py` com as ferramentas locais: `sips` para recortar e redimensionar a partir de `src/photos/originals/<chave>-orig.jpg`, depois `avifenc` e `cwebp`. Guardar em cache por hash do original, para não recodificar a cada build. Os originais (30 MB) entram no repositório ou em Git LFS; decidir antes de implementar.
- Sem gradação embutida nos arquivos: o tratamento por tema é feito por camadas CSS (6.6), para que uma só imagem sirva aos dois temas.
- **LCP:** `<link rel="preload" as="image" imagesrcset imagesizes media>` só para a foto do herói (um par de links: mobile e desktop, AVIF). Fundo `--scene` enquanto carrega; a imagem entra com fusão de 400 ms.
- **Segunda foto de cenário** (`leopard`, `nyfold`): sem `src` no HTML; o script atribui quando a janela anterior chega a 1,5 viewport de distância.
- Sem `background-attachment: fixed` (falha no iOS): o cenário é um `div` fixo com `<picture>` dentro.

### 7.7 Como a receita declara o cenário

`src/recipes/<id>/recipe.json`:

```json
"scene": {
  "mood": "brasa",
  "takes": {
    "hero":  { "photo": "oro",     "d": { "f": [45, 48], "a": [64, 52], "s": 1.00, "bleed": "l" },
                                   "m": { "f": [31, 100], "a": [50, 100], "s": 0.66, "bleed": "t" } },
    "tempo": { "photo": "oro",     "d": { "f": [56, 80], "a": [68, 38], "s": 1.30 },
                                   "m": { "f": [48, 82], "a": [50, 40], "s": 1.00 } },
    "gesto": { "photo": "oro",     "d": { "f": [20, 56], "a": [70, 40], "s": 1.30 },
                                   "m": { "f": [18, 60], "a": [50, 40], "s": 1.00 } },
    "fogo":  { "photo": "leopard", "d": { "f": [42, 74], "a": [68, 40], "s": 1.12 },
                                   "m": { "f": [40, 74], "a": [50, 40], "s": 1.00 } },
    "fim":   { "photo": "oro",     "d": { "f": [45, 48], "a": [50, 42], "s": 1.00 },
                                   "m": { "f": [45, 50], "a": [50, 42], "s": 1.00 } }
  }
}
```

`src/photos/photos.json` ganha, para as fotos de cenário: `"ow"`, `"oh"` (dimensões do original) e `"crop_m": [x0, y0, w, h]`.

O build deve **falhar** se: faltar `scene.takes.hero`; a foto não tiver autor, licença e fonte; alguma tomada desktop violar `s × 1440 × 2 > 3840`; alguma tomada mobile sair do `crop_m`; a foto do herói de uma receita for a mesma de outra receita.

Textos novos por receita e idioma (`src/recipes/<id>/<lang>.json`): `scene.tempo.h`, `scene.tempo.p`, `scene.gesto.*`, `scene.fogo.*`, `scene.fim.h`. Comuns (`src/i18n/<lang>.json`): nomes dos capítulos (`chap.1` … `chap.6`). Sugestões em português estão no storyboard; em inglês: "Three days, one night." / "Watch first, then do." / "Ninety seconds decide everything." / "Flour, water, salt, time."

O crédito de cada tomada sai do `photos.json` pelo mesmo trecho que hoje monta `figure()`, com o rótulo `html.photo`.

---

## 8. Storyboard da navegação

Estrutura de camadas (de trás para a frente):

```
z0  .scene        position: fixed; inset: 0; height: 100lvh      cenário (foto + escurecimento do tema)
z1  main          fluxo normal: herói · folhas · janelas · cena final
        herói / janela / fim   transparentes, com véu próprio no ::before
        folha                  opaca, com sombra para cima
z20 .topbar       position: fixed
```

Itens sticky ou fixos: o cenário (fixo, a página toda); a topbar (fixa); o painel de parâmetros (sticky só dentro do capítulo I, ≥ 821 px); o player (sticky só dentro do capítulo III, ≥ 1100 px). **Nenhuma seção prende o scroll.**

Gatilho de troca de tomada: observador de interseção em cada elemento `[data-take]`; a tomada ativa é a do último elemento cujo topo passou de 90% da altura do viewport. Assim a câmera começa a se mover quando a janela desponta na base da tela, e chega enquanto ela abre.

| # | Trecho | Altura | Enquadramento do cenário | Entrada | Saída | O que o texto faz |
|---|---|---|---|---|---|---|
| 0 | **Herói** | 100svh | `hero`: pizza à direita (desktop) ou meia-lua na base (mobile) | Carga: foto surge em 400 ms; texto entra em cascata (pílula, título, lead, seletor), 60 ms entre itens | Avanço lento: escala +5% e texto a 0% de opacidade ao longo dos primeiros 80svh (só com suporte a scroll-driven) | Fica parado; some suavemente ao sair |
| 1 | **Folha I · Receita** | conteúdo | Coberto. Nas bordas arredondadas ainda se vê o herói | A folha sobe sobre a foto parada (efeito cortina, sem animação: é o próprio scroll) | — | Faixa de KPIs cavalga a borda. Painel sticky |
| 2 | **Janela II · O tempo** | 68svh (72 no mobile) | `tempo`: borda inferior com bolhas | Câmera desliza de `hero` para `tempo` em 1,4 s (mesma foto: translação + escala) | A folha II sobe por cima | Pílula "II · O tempo", título "Três dias, *uma noite.*", uma frase. Entra uma vez (fade + 16 px) |
| 3 | **Folha II · Cronograma** | conteúdo | Coberto | Folha com 4 cantos arredondados | — | Linha do tempo; próximo evento destacado |
| 4 | **Janela III · O gesto** | 68svh | `gesto`: cornicione esquerdo | Câmera desliza de `tempo` para `gesto` (1,4 s) | Folha III sobe | "Assista antes, *faça depois.*" |
| 5 | **Folha III · Assista + Passo a passo** | conteúdo (a mais longa) | Coberto | — | — | Player sticky à esquerda acompanha a etapa em foco; etapas concluídas recolhem |
| 6 | **Janela IV · O fogo** | 68svh | `fogo`: `leopard`, manchas em close | **Corte com fusão** de `oro` para `leopard`: 700 ms de opacidade, com a nova foto já no enquadramento final. A foto é carregada quando a janela está a 1,5 viewport | Folha IV sobe | "Noventa segundos *decidem tudo.*" + crédito da `leopard` |
| 7 | **Folha IV · Forno** | conteúdo | Coberto | — | — | Timer escuro; diagnóstico |
| 8 | **Fresta** | 20 px | `fogo` ainda ativo, quase imperceptível | — | — | — |
| 9 | **Folha V–VI · Regras, glossário, Sobre** | conteúdo | Coberto | — | — | Leitura editorial; figuras com crédito |
| 10 | **Cena final + rodapé** | 72svh (60 no mobile) | `fim`: volta à `oro`, plano aberto e centrado, véu denso | Fusão de `leopard` para `oro` (700 ms) | Fim da página | Frase de fecho em itálico; rodapé em linha |

Na New York a sequência é a mesma; as três janelas usam a `nyslice` (movimento de câmera, sem corte) e só a cena final faz fusão para a `nyfold`.

Navegação por âncora: os links da topbar levam aos ids atuais (`#receita`, `#cronograma`, `#assistir`, `#passos`, `#forno`, `#regras`, `#sobre`), que ficam nas folhas, não nas janelas. `scroll-padding-top: 72px`. Ao saltar, a tomada é trocada **sem transição** (o cenário está coberto), para não gastar animação fora de vista.

---

## 9. Animações e microinterações

Prioridade: **P1** = essencial ao conceito; **P2** = reforça; **P3** = se sobrar orçamento.

| P | Elemento | Gatilho | Movimento | Duração / curva | Com reduced-motion |
|---|---|---|---|---|---|
| P1 | Cortina (folha sobre cenário fixo) | scroll nativo | Nenhuma animação: efeito de camadas | — | Igual (não é animação) |
| P1 | Troca de tomada, mesma foto | janela desponta (topo < 90% do viewport) | `transform` (translação + escala) | 1400 ms, `--ease-cam` | Troca instantânea, disparada com 50% de margem abaixo do viewport (fora de vista) |
| P1 | Troca de tomada, outra foto | idem | Fusão de opacidade; a nova foto nasce no enquadramento final | 700 ms, linear | Troca instantânea, fora de vista |
| P1 | Topbar transparente → sólida | `scrollY > 100svh − 70px` | Fundo, cor do texto, fio | 250 ms, `--ease-ui` | Instantânea |
| P1 | Check "Concluído" | clique | Caixa preenche; cartão vai a 62% e recolhe o corpo; barra da topbar avança | 180 ms caixa; 250 ms recolher; 400 ms barra | Sem transição; estados iguais |
| P1 | Timer | início | Marcador desliza no trilho; texto de estado muda nas faixas | contínuo (já existe, `requestAnimationFrame`) | Mantido: é informação, não decoração |
| P2 | Entrada do herói | carga | Foto: opacidade 0 → 1. Texto: opacidade + 16 px para cima, em cascata | 400 ms foto; 500 ms por item, 60 ms de intervalo, `--ease-ui` | Tudo visível de imediato |
| P2 | Avanço do herói | scroll, 0 → 80svh | Cenário: escala 1 → 1,05 (origem em 64% 52%). Texto: opacidade 1 → 0, −24 px | Esfregado por `animation-timeline: scroll()`, dentro de `@supports`; sem alternativa em JS | Desligado |
| P2 | Texto da janela | janela 35% visível, uma vez | Opacidade + 16 px | 500 ms, `--ease-ui` | Visível de imediato |
| P2 | Etapa em foco | etapa cruza 40% do viewport | Fio esquerdo acende; player troca de cena | 250 ms fio; cena do player conforme `player.js` | Fio sem transição; player mostra quadro final da cena |
| P2 | KPIs e tabela ao recalcular | mudança de parâmetro | Valores alterados piscam com fundo `accent-soft` | 600 ms, saída linear | Sem piscar |
| P2 | Botões | pressionar | `scale(.97)` | 80 ms | Sem escala |
| P3 | Deriva na janela | janela visível | Escala +2% lenta enquanto a janela está em tela | 8 s, linear, uma vez | Desligada |
| P3 | Chip do diagnóstico → resposta | clique | Resposta entra com opacidade + 8 px | 200 ms | Imediata |
| P3 | "Próximo evento" | a cada minuto | Anel do ponto pulsa uma vez quando o evento muda | 600 ms | Sem pulso |

Regras gerais:
- Só `transform` e `opacity` são animados. Nada de `object-position`, `filter`, `width` ou `top`.
- `will-change: transform` apenas na camada do cenário.
- No máximo uma transição de câmera por vez; uma nova tomada interrompe a anterior a partir do estado atual.
- Sem scroll suave por JS, sem snap, sem trechos presos. `scroll-behavior: smooth` só para cliques na nav e desligado com reduced-motion.
- `@media (prefers-reduced-motion: reduce)`: todas as transições e animações CSS zeradas (regra global já existente), `player.js` segue a própria variável `reduced`, e as trocas de tomada acontecem fora de vista. O layout, as fotos e os véus são idênticos.
- No pré-render (`?prerender=1`) o script da câmera não roda: o HTML gravado leva o enquadramento do herói como variáveis CSS calculadas pelo build, sem `style` de transformação gerado em tempo de execução.
- Sem JavaScript: o cenário mostra só a tomada `hero`, posicionada por CSS (`object-fit: cover` + `object-position` derivados do foco); janelas e folhas funcionam normalmente.

---

## 10. Critérios de aceitação verificáveis

**Herói**
1. Desktop 1440 × 900: herói com 100svh; centro da pizza entre 60% e 68% da largura; nenhuma borda dura da foto visível (a borda esquerda dissolve em `#120E0C`).
2. Mobile 390 × 844: herói com 100svh; a foto começa entre 30% e 38% da altura; o sujeito ocupa a faixa de 50% a 90%; o texto termina antes de 50%; título, lead e seletor de pizzas visíveis sem rolar.
3. Mobile 360 × 640: título, lead e seletor não se sobrepõem (o herói pode passar de 100svh).
4. `/pt/new-york/` e `/en/new-york/` abrem com `nyslice`; nenhuma foto de pizza napolitana no primeiro viewport; a lata e a rua não aparecem fora do véu.
5. Crédito da foto do herói visível no primeiro viewport, com autor, licença e dois links, nos quatro endereços.

**Contraste**
6. Todo texto sobre a foto tem véu ≥ 62% de `#120E0C` por baixo, ou fundo sólido. Verificação: captura de tela nos dois temas e medição do pior pixel sob cada bloco de texto, com resultado ≥ 4,5:1 (≥ 3:1 para texto ≥ 32 px).
7. Todo texto nas folhas atinge ≥ 4,5:1 nos dois temas (pares de 6.1); bordas de controles ≥ 3:1.
8. Alternar o tema não altera o layout nem a posição da foto; muda só o escurecimento, o véu e as folhas.

**Cenário e câmera**
9. Nenhum `<canvas>`, WebGL, `three` ou `importmap` na página; `world3d.js` e `style-3d.css` removidos; `.has-3d` não existe.
10. O scroll é nativo: a posição da página acompanha a roda ou o dedo 1:1 em todo o percurso; nenhuma seção com `position: sticky` maior que o próprio conteúdo.
11. Cada janela mostra um enquadramento diferente do anterior; a troca de foto (`oro` → `leopard`) é por fusão, sem salto visível.
12. Em 1440 px a 2×, a foto do herói é servida com ≥ 2560 px de largura; nenhuma tomada usa `s > 1,30` no desktop.
13. Em 390 px a 3×, o arquivo servido é o recorte mobile (`-m-`), não o 4:3.
14. Girar o aparelho ou redimensionar a janela reposiciona o cenário sem deixar faixa vazia (exceto as bordas com `bleed`).
15. No iOS Safari, recolher a barra de endereço não faz a foto pular.

**Ferramenta**
16. Todas as funções listadas em "Precisa ser preservado" do diagnóstico continuam operando com os mesmos ids e as mesmas chaves de `localStorage`.
17. Tabela da napolitana (5 colunas) sem rolagem horizontal em 360 px.
18. Alvos de toque ≥ 44 × 44 px; botões do timer e do seletor de pizzas ≥ 48 px.
19. O player aparece nas duas receitas e nos dois idiomas; em ≥ 1100 px fica sticky e troca de cena conforme a etapa em foco; abaixo disso fica no fluxo e não cobre as etapas.
20. O timer é legível a 2 m (relógio ≥ 72 px) e mantém o wake lock.

**Movimento e acessibilidade**
21. Com `prefers-reduced-motion: reduce`: nenhuma transição de `transform` ou `opacity` visível; as tomadas trocam fora de vista; conteúdo e ordem idênticos.
22. Navegação completa por teclado, com foco visível (3 px) em todos os controles, inclusive sobre a foto.
23. A camada de cenário tem `aria-hidden="true"` e `alt=""`; a foto do herói também aparece no Sobre com texto alternativo e legenda.
24. Sem JavaScript, a página mostra herói com foto, folhas e janelas legíveis.

**Desempenho** (Lighthouse mobile, 4G lento simulado)
25. LCP ≤ 2,5 s, sendo o elemento de LCP a foto do herói ou o `h1`.
26. CLS ≤ 0,02; INP ≤ 200 ms.
27. Bytes de imagem até o primeiro viewport ≤ 260 KB no mobile e ≤ 450 KB no desktop (1440 a 2×).
28. JavaScript de terceiros limitado ao GSAP (usado pelo player); o script da câmera tem ≤ 2 KB minificado e não registra ouvinte de scroll (só observadores de interseção e `resize`).
29. Nenhuma tarefa longa (> 50 ms) causada por scroll em um Android intermediário.

**Build**
30. `build.py` falha nas condições de 7.7 e gera as variantes AVIF/WebP/JPG com `width` e `height` explícitos.
31. Pré-render, JSON-LD, sitemap, redirecionamentos e imagens OG continuam sendo gerados.

---

## Anexo: mudanças de código implicadas (para o plano de implementação)

- `src/template.html`: remover `importmap`, `{{WORLD_JS}}`, `#hero3d`, `.steps3d`/`#stage3d`; inserir `.scene` com `<picture>`; envolver seções em folhas; adicionar as três janelas e a cena final; mover `#assistir` para dentro do capítulo III; trocar o `<link>` de fontes.
- `src/style.css`: reescrever com os tokens de §6; apagar `src/style-3d.css`.
- `src/player.js`: expor `NP.player`; herdar tokens; remover dependência de `.has-3d`.
- Novo `src/scene.js` (câmera, ~60 linhas) embutido inline como os demais.
- `build.py`: ler `scene` de `recipe.json`; gerar variantes de imagem; emitir `preload`; validar; crédito de cena.
- `src/photos/photos.json`, `src/recipes/*/recipe.json`, `src/recipes/*/{pt,en}.json`, `src/i18n/{pt,en}.json`: campos de 7.7.
- `src/photos/originals/`: originais das fotos de cenário (`oro`, `leopard`, `nyslice`, `nyfold`).
