# Jornada · 01 · Estratégia — "Piano Sequenza"

Rodada de concepção sobre a branch `redesign-imersivo` (commit 1f832ec). Nada em `src/`, `build.py` ou `docs/` foi alterado. Protótipo: `design/jornada/prototipo/index.html` (servir a raiz do repositório e abrir `/design/jornada/prototipo/index.html`).

Parâmetros de teste do protótipo (só para QA, não fazem parte do produto): `?theme=light|dark`, `?motion=off` (força a versão estática), `?driver=js` (força o motor de rolagem em JS no lugar do CSS).

O que muda em relação ao "Luce di Forno": lá a foto era um cenário fixo e as ferramentas passavam por cima em folhas opacas; a receita em si continuava sendo uma lista. Aqui a receita **é** o percurso: cada etapa tem a sua cena pintada, a câmera anda pela bancada conforme a pessoa rola, e as ferramentas estão dentro das cenas.

---

## 1. Conceito

**Nome:** *Piano Sequenza* (plano-sequência). **Metáfora:** uma única bancada comprida, filmada num único plano que dura três dias. A câmera anda de lado, da esquerda para a direita, e cada etapa é um trecho da bancada. Quem rola a página empurra a câmera.

**A luz é o relógio.** A parede atrás da bancada muda de cor ao longo do percurso: fim de tarde na abertura, noite com luminária no pré-fermento, o amanhecer atravessando a parede na mistura, luz de janela nas dobras, tarde dourada na divisão, penumbra e brasa no forno. A pessoa sabe em que dia está sem ler nada. As duas esperas na geladeira (20 h e 24 h) são os únicos momentos em que a câmera "entra" em algo: a cena esfria, fica azulada, e sai do outro lado em outro dia.

**Mood:** cozinha de casa, não pizzaria. Parede de cal, madeira de nogueira, cerâmica, vidro, pano de linho. Pintura de guache: massas de cor chapada com sombra própria, borda levemente irregular, grão de papel por cima. Sem contorno preto, sem ícone flat.

**Paleta em uma linha:** cal e trigo (parede e massa), nogueira (bancada), tomate (um único vermelho, usado em ação e no molho), manjericão (concluído), brasa (forno e tempo), azul-frio (geladeira).

**Por que serve a esta receita.** A napolitana do site é um processo de três dias em que 95% do tempo é espera e o que decide o resultado é observar a massa ("a massa manda mais que o relógio"). Uma lista de 13 cartões iguais esconde isso; um percurso em que a luz muda e a massa visivelmente cresce de uma cena para a outra ensina o ritmo antes do texto.

**Por que serve a quem cozinha.** A pessoa usa o site com a mão suja de massa, no celular apoiado na bancada, em três sessões separadas por um dia cada. Disso saem as regras duras do projeto:

1. **Texto de trabalho sempre sobre papel opaco**, nunca direto sobre a ilustração. Corpo 18 px no celular, quantidades em mono 20 px ou mais.
2. **Alvos de 48 px ou mais** (56 px nos controles da abertura, do "feito" e do timer). Dá para tocar com o nó do dedo.
3. **Retomar de onde parou** é função de primeira classe: o site abre oferecendo "Continuar na etapa 07", não a capa.
4. **Tela acesa** (Wake Lock) enquanto o timer roda e, opcionalmente, durante a sessão de trabalho de uma etapa.
5. **Rolagem nativa**: nada prende, nada acelera. A câmera é uma função pura da posição de rolagem; se a pessoa rolar depressa, a câmera anda depressa.
6. **A cena nunca é pré-requisito**: com movimento reduzido, sem JS ou num leitor de tela, a página é uma lista ordenada de etapas com figura, texto e quantidades.

---

## 2. Mecânicas de transição comparadas

### A. Travelling lateral em bancada contínua (janelado)
A rolagem vertical move a câmera na horizontal. Cada etapa é um "ladrilho" de uma tela de largura; durante a passagem de uma etapa para a outra, o ladrilho atual sai pela esquerda enquanto o próximo entra pela direita, colados, na mesma velocidade. A linha da bancada fica na mesma altura em todos e a cor da parede na borda direita de um ladrilho é a mesma da borda esquerda do seguinte, então não há emenda. Dentro do ladrilho, objetos de fundo (janela, prateleira, luminária) andam um pouco mais devagar e objetos de primeiro plano um pouco mais depressa. Só os dois ladrilhos próximos da tela existem na árvore de renderização.

### B. Zoom-through (mergulho)
Cada cena tem um "portal" (a boca do pote, a porta da geladeira, a boca do forno). Ao rolar, a câmera aproxima até o portal ocupar a tela e a cena seguinte nasce de dentro dele.

### C. Planos em parallax com dissolução
Cada cena é um quadro fixo com 3 planos de profundidade que se deslocam alguns por cento com a rolagem; a troca de cena é um cross-fade (ou uma máscara de pincelada) entre dois quadros.

### Comparação (1 = pior, 5 = melhor)

| Critério | A. Travelling | B. Zoom-through | C. Parallax + dissolução |
|---|---|---|---|
| Impacto na primeira visita | 4 | 5 | 3 |
| Sensação de "estar dentro" e de universo contínuo | 5 (o espaço é literal) | 4 (contínuo, mas abstrato) | 2 (são slides) |
| Fluidez (acompanha o dedo, sem tranco) | 5: só `translate` em 2 camadas compostas | 2: escala grande obriga a re-rasterizar o SVG a cada quadro ou a borrar | 4: `opacity` é barato, mas dois quadros cheios sobrepostos |
| Viabilidade em SVG pintado | 5: cenas independentes com regras de borda | 2: cada cena precisa de detalhe em duas escalas; o portal precisa casar com a cena seguinte | 5 |
| Desempenho em celular intermediário | 4: 2 ladrilhos vivos, nada pinta durante a rolagem | 2: filtros de textura reescalados; memória de textura alta | 3: `opacity` em camadas grandes com filtro |
| Acessibilidade vestibular | 3: movimento lateral lento e previsível; versão estática trivial | 1: zoom contínuo é o gatilho clássico de enjoo | 4 |
| Texto e ferramentas legíveis durante a transição | 5: o cartão rola na vertical, independente da cena | 2: tudo está se movendo em direção ao leitor | 4 |
| Retrato no celular | 4: ladrilho = largura da tela; o enquadramento só precisa centralizar o assunto | 3 | 4 |
| Custo de produção (13 cenas × 2 receitas × 2 temas) | 4: reaproveita adereços; tema por variável | 1 | 4 |
| Âncoras, retomar no meio, pré-render | 5: cada etapa é um `<li>` com id | 3: posição depende do progresso do zoom | 5 |

### Escolha: **A, com dois empréstimos**
- **De C:** três planos de profundidade dentro de cada ladrilho (fundo, assunto, primeiro plano) e respiração lenta enquanto a cena está parada (vapor, bolhas, brasa). O deslocamento extra é pequeno (fundo ±5%, primeiro plano ±10% da largura), o suficiente para dar profundidade sem abrir emenda.
- **De B:** só a ideia do portal, sem zoom, nas duas geladeiras: a cena da espera é um ladrilho frio e azulado entre dois dias. É uma mudança de luz, não de escala.

Motivos: (1) é a única das três em que a metáfora e a mecânica são a mesma coisa: a bancada tem começo, meio e fim, como a receita; (2) custa só `transform: translate3d` em elementos fixos, que o compositor resolve sem pintar; (3) a leitura continua vertical e nativa, o que resolve de uma vez scroll-jacking, âncoras e leitor de tela; (4) a versão de movimento reduzido é a mesma marcação com a figura parada em cima de cada etapa.

**Implementação da mecânica** (provada no protótipo):
- Cada etapa é `<li class="step">` em fluxo normal, com altura mínima maior que a tela. Dentro dele, `<figure class="scene">` com `position: fixed; inset: 0` e o cartão em fluxo normal (sticky no desktop).
- O `<li>` declara `view-timeline: --step block`. A figura usa `animation-timeline: --step` com quadros nomeados: `entry 0%` → `translateX(100%)`, `entry 100%` e `exit 0%` → `0`, `exit 100%` → `translateX(-100%)`. Como os `<li>` são adjacentes, a saída de um e a entrada do próximo ocupam exatamente os mesmos 100vh de rolagem: os ladrilhos andam colados.
- Tudo atrás de `@supports (animation-timeline: view())`. Sem suporte (Firefox estável), um único ouvinte `scroll` passivo + `requestAnimationFrame` aplica o mesmo `transform` só nos ladrilhos vivos (2 no máximo). Mesma matemática, mesmo resultado.
- `IntersectionObserver` com margem de meia tela marca `li.live`; ladrilhos não vivos ficam `display: none` e as animações internas ficam pausadas.
- Movimento reduzido (`prefers-reduced-motion` ou o interruptor "Movimento" nos ajustes): a figura vira `position: relative` com ~50vh de altura no topo de cada etapa, sem animação.

---

## 3. Arquitetura da experiência

```
/pt/  (napolitana)   /pt/new-york/   /en/   /en/new-york/      ← mesmas rotas de hoje
│
├─ 0. ABERTURA  (#abertura)          "Qual pizza, e quanta?"
│     receita (2 opções) · quantidade (farinha g ⇄ nº de pizzas) · [Começar]
│     se houver progresso salvo: [Continuar na etapa NN · título]
│
├─ JORNADA  <ol class="journey">     uma cena por etapa, capítulos = dias
│   ├─ Prólogo · Mise en place (#mise)      tabela da receita completa, divisão da água
│   ├─ DIA 1 · noite        01 pré-fermento
│   │      ↳ interlúdio "Geladeira · 20 h" (#frio1)  → cronograma entra aqui
│   ├─ DIA 2 · manhã/tarde  02 mistura · 03 bassinage · 04 dobras · 05 azeite · 06 laminação · 07 dividir e bolear
│   │      ↳ interlúdio "Geladeira · 24 h" (#frio2)
│   └─ DIA 3 · fim de tarde 08 temperar · 09 molho e queijo · 10 pré-aquecer · 11 abrir · 12 montar · 13 assar (timer)
│
└─ EPÍLOGO  (#epilogo)               superfície sólida ("o caderno")
      A primeira pizza: diagnóstico com "aplicar" → Regras → Glossário → Sobre (fotos reais + créditos) → rodapé
```

### Onde fica cada ferramenta

| Ferramenta de hoje | Lugar na jornada | Acesso global |
|---|---|---|
| Escolha de receita, modo farinha/pizzas, quantidade | **Abertura** | Botão "Massa" na barra (resumo `800 g · 5 pizzas`) abre os ajustes |
| Parâmetros avançados (hidratação, sal, azeite, fermento, % pré-fermento, peso do panetto, geladeira, resistências, coberturas) | **Painel "Ajustes"**: folha inferior no celular, gaveta lateral no desktop, `<dialog>` nativo. Não sai da cena; a cena atrás recalcula ao vivo | Botão "Massa" sempre visível |
| Tabela da receita + divisão da água + alternativa de panetti + alertas | **Prólogo "Mise en place"**: a cena mostra os ingredientes pesados com etiqueta; o cartão traz a `<table>` | Aba "Receita" dentro dos ajustes (mesma tabela) |
| Quantidades por etapa | **Etiquetas na cena** (penduradas no objeto: pote, jarra, bandeja) + mesmas quantidades no texto do cartão | — |
| Cronograma (hora de assar → horários) | Campo "Assar em" nos ajustes e no interlúdio da geladeira; **cada cartão mostra seu horário** ("sex 20:30"); a etapa do horário atual ganha o selo "agora" | Aba "Agenda" nos ajustes, com a linha do tempo completa e o "próximo evento" |
| "Feito" por etapa + progresso | Checkbox grande em cada cartão; barra de progresso e contagem na navegação de capítulos | Trilho de capítulos |
| Player animado ("Ver o gesto") | **Deixa de existir como bloco**: a própria cena da etapa é a demonstração. As coreografias do `player.js` (despejar, mexer, dobrar, bolear) viram o botão "Ver o gesto" dentro da cena, tocando sobre a ilustração | — |
| Timer do forno | **Cena 13 (assar)**: anel de tempo em volta da boca do forno + cartão com iniciar/pausar/zerar e faixas 25–30 s / 70–120 s | Quando rodando, um mini-timer aparece na barra em qualquer ponto |
| Diagnóstico do forno ("aplicar") | **Epílogo, primeiro bloco**, logo após a cena do forno; também um atalho "Como saiu?" no cartão da etapa 13 | — |
| Regras, glossário | Epílogo. Termos do glossário também viram sublinhado pontilhado no texto das etapas, com definição no toque | — |
| Sobre + fotos reais + créditos | Epílogo. As fotos reais (Wikimedia) saem do percurso e ficam só aqui, com crédito e licença, como "a pizza de verdade" depois da pintura | — |
| Idioma, tema, receita | Barra superior (tema, idioma) e ajustes (receita) | — |

### Voltar à pergunta e mudar parâmetros
- O botão "Massa" na barra mostra sempre o resumo atual e abre os ajustes. A primeira seção dos ajustes é a própria pergunta de abertura (receita + quantidade); as demais ficam recolhidas ("Fórmula", "Ambiente e forno", "Coberturas", "Agenda").
- Trocar de receita navega para a rota da outra receita (páginas separadas, como hoje, por SEO) e leva a quantidade junto por `localStorage`.
- "Voltar ao início" no trilho de capítulos rola até `#abertura`.
- Mudanças recalculam tudo na hora: etiquetas das cenas, texto dos cartões, horários, número de panetti desenhados.

### Retomar no meio
- `localStorage` por receita (mesma chave `ls` de hoje): parâmetros, etapas feitas, hora de assar, **última etapa em foco** e data.
- Cada etapa tem `id` (`#s1` … `#s14`) e a URL é atualizada com `history.replaceState` quando a etapa em foco muda (sem poluir o histórico). Um link compartilhado cai direto na cena.
- Ao abrir com progresso salvo: a abertura mostra **"Continuar na etapa 07 · Dividir e bolear"** como ação principal e "Começar de novo" como secundária. Se houver âncora na URL, ela vence.
- Sem scroll automático nunca: retomar é sempre um toque.

### Comportamento com o cronograma
- Com "Assar em" definido, cada etapa pertence a um evento do cronograma (as mesmas 7 janelas de `recipe.json › sched`). O cartão mostra o horário de início.
- **Etapa atual pelo horário:** o último evento que já começou e cujo sucessor ainda não começou. Ela recebe o selo "agora" no cartão e no trilho, e a abertura passa a dizer "Agora: 02 · Mistura inicial (começou há 20 min)".
- Eventos futuros mostram contagem ("em 3 h 10"); a espera na geladeira mostra "faltam 14 h" dentro do interlúdio.
- O horário nunca bloqueia nada: a pessoa pode percorrer e marcar qualquer etapa.
- Avisos de hoje ("começo no passado", "panetti acima de 36 h") aparecem no interlúdio da geladeira e na aba Agenda.

---

## 4. Storyboard

Convenções: bancada com a linha de fundo a 62% da altura (48% no celular, porque o cartão ocupa a parte de baixo). Câmera sempre da esquerda para a direita. "Etiqueta" = papel pardo preso ao objeto com a quantidade em mono. Planos: **F** fundo (lento), **A** assunto, **P** primeiro plano (rápido).

### Napolitana (13 etapas reais + prólogo, 2 interlúdios e epílogo)

| # | id | Cena e luz | O que a ilustração mostra | Câmera (entra → sai) | Texto e quantidades | Animado (parado) |
|---|---|---|---|---|---|---|
| 0 | `#abertura` | Fim de tarde, parede ocre | Bancada vazia com saco de farinha "00", jarra, balança; janela ao fundo | Começa parada; sai para a esquerda | Pergunta no centro (desktop: à esquerda) | Poeira de farinha na luz |
| P | `#mise` | Mesma luz, escurecendo | Ingredientes pesados em potes: farinha, água, sal, azeite, fermento | Entra pela direita; F mostra a prateleira | Etiqueta em cada pote (`flour`, `water`, `salt`, `oil`, `yeast`); cartão com a tabela completa | — |
| 01 | `#s1` | **Dia 1, noite.** Luminária acesa, janela azul-escura | Pote de vidro com a pasta do pré-fermento, colher, saquinho de fermento; à direita, a quina da geladeira com a porta entreaberta e luz fria | Entra pela direita; a parede escurece da esquerda para a direita; a geladeira é o último objeto antes de sair | Etiquetas `pfFlour` + `yeast` + `pfWater`; cartão à esquerda | Bolhas subindo na pasta; halo da luminária pulsa de leve |
| ❄ | `#frio1` | Interior frio, azul | Pote na prateleira da geladeira, bolhas maiores; relógio de parede | Ladrilho curto (1 tela); sem assunto novo | "≈ `pfh` h a `fridge` °C" grande; campo "Assar em"; próximo evento | Bolhas lentas; ponteiro do relógio |
| 02 | `#s2` | **Dia 2, amanhece.** A parede vai do azul-noite ao creme | Tigela de cerâmica com massa grosseira; copo com água e sal; pote do pré-fermento virado | A luz "varre" a parede durante a entrada | Etiquetas `salt`, `initWater`, `finFlour` | Vapor frio do pote; grãos de sal dissolvendo |
| 03 | `#s4` | Manhã, luz de janela | Jarra inclinada sobre a tigela, fio de água | Entra já com a tigela da cena 02 em continuidade (mesma posição) | Etiqueta `bassWater` na jarra; "em porções" | Fio de água e gotas; ondulação na massa |
| 04 | `#s5` | Manhã alta | Massa lisa sobre a bancada; setas de giz indicando esticar e dobrar (sem mãos) | — | Sem quantidade; ciclos de descanso como marcas de giz | Setas se desenham em sequência; massa "respira" |
| 05 | `#s6` | Meio-dia | Garrafa de azeite, fio dourado, massa brilhante | — | Etiqueta `oil` | Fio de azeite; brilho passeando |
| 06 | `#s7` | Começo da tarde | Massa esticada em retângulo com uma dobra feita; ampulheta | — | "1 h" na ampulheta; "sem rolo" em giz | Dobra se fecha (loop lento) |
| 07 | `#s8` | Tarde dourada | Bandeja com **n** panetti (desenhados conforme o cálculo), espátula, balança marcando `per` | — | Etiqueta `n × per g`; total | Panetti surgem um a um ao entrar em foco |
| ❄ | `#frio2` | Interior frio | Bandeja tampada na geladeira | Ladrilho curto | "≈ `panh` h"; aviso de > 36 h | Condensação |
| 08 | `#s9` | **Dia 3, fim de tarde.** Luz rasante laranja | Bandeja fora, panetti maiores e relaxados, bolhas na lateral; pote de 1 L com a marca da metade | — | "`outh` h fora"; aviso "não reboleie" | Panetti crescem alguns por cento em loop muito lento |
| 09 | `#s10` | Fim de tarde | Lata de pelati aberta, tigela de tomate esmagado, mozzarella escorrendo, manjericão | — | Etiquetas `cans`, `cheeseTotal`, sal por lata | Gota de soro; folha balança |
| 10 | `#s11` | Anoitecer | Forno BIG HORN apagado → resistências começando a brilhar; termômetro IV | O forno entra pela direita e passa a ser o fundo fixo das cenas 10–13 | Etiquetas `top` °C e `bottom` °C sobre as resistências | Brilho subindo; ar tremendo acima do forno |
| 11 | `#s12` | Anoitecer, bancada enfarinhada | Disco de massa visto um pouco de cima; setas de giz do centro para fora; borda de 1–1,5 cm marcada | Forno ao fundo (F), desfocado | "30–32 cm" como cota de desenho técnico | Setas radiais; farinha assentando |
| 12 | `#s13` | Noite, luz do forno | Pizza montada sobre a pá: molho em espiral, mozzarella espaçada, manjericão | — | Etiquetas `sauce` g e `cheese` g | Espiral de molho se desenha; pá faz o pequeno vai-e-vem de teste |
| 13 | `#s14` | **Noite, brasa.** Parede quase preta, tudo iluminado pela boca do forno | Boca do forno em primeiro plano, pizza na pedra, cornicione subindo | Última entrada; a câmera para | **Timer**: anel em volta da boca + cartão com controles e faixas | Brilho das resistências; cornicione cresce com o timer; manchas aparecem após 70 s |
| E | `#epilogo` | Papel | A pizza pronta numa tábua (vinheta pequena, não mais tela cheia) | A última cena sai para cima, não para o lado: fim do travelling | Diagnóstico, regras, glossário, Sobre | — |

### New York (12 etapas reais; reaproveita cenas)

| # | id | Cena reaproveitada | Diferenças |
|---|---|---|---|
| 0, P | — | abertura, mise | Saco "Manitoba"; pote de açúcar a mais; sem pote de pré-fermento |
| 01 | `s1` Misturar a massa | cena 02 (tigela) | Luz de **noite do dia 1**; etiquetas `flour`, `yeast`, `sugar`, `salt`, `water` |
| 02 | `s2` Incorporar o azeite | cena 05 | — |
| 03 | `s3` Sovar | cena 04 | Setas de giz de "empurrar, dobrar, girar"; vinheta do teste da janela (membrana contra a luz) |
| 04 | `s4` Primeiro descanso | cena 08 (uma bola só, numa tigela untada) | Relógio "1 h" |
| 05 | `s5` Dividir, bolear e refrigerar | cena 07 | Potes individuais no lugar da bandeja; `n × per` |
| ❄ | `frio` | interlúdio | "≈ 48 h"; única geladeira; a luz salta do dia 1 ao dia 3 |
| 06 | `s6` Temperar as bolas | cena 08 | Potes tampados |
| 07 | `s7` Molho e queijo | cena 09 | Molho liso (peneira), muçarela ralada de bloco, orégano, parmesão, calabresa |
| 08 | `s8` Pré-aquecer | cena 10 | `top`/`bottom` da New York |
| 09 | `s9` Abrir | cena 11 | Disco maior e mais fino; seta de "nós dos dedos" |
| 10 | `s10` Montar e lançar | cena 12 | Queijo ralado até a borda; sêmola na pá |
| 11 | `s11` Assar e girar | cena 13 | Timer de 5–7 min, marcas a cada minuto para girar |
| 12 | `s12` Finalizar e fatiar | **cena nova (única exclusiva)** | Pizza na grade, cortador, uma fatia dobrada |

Cenas a pintar no total: **16** (abertura, mise, interlúdio frio, 13 da napolitana) + **1** exclusiva da New York. As demais são variações por parâmetro (luz, adereços ligados/desligados, rótulos).

---

## 5. Layout

### Desktop (≥ 960 px; referência 1440×900)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ NapoliProtocol        Dia 2 · etapa 03 de 13          [800 g · 5 pizzas] ◐ PT │  barra 56 px, translúcida
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                            ● │
│   ┌───────────────────────┐          (plano F: janela, prateleira)         ● │
│   │ ETAPA 03 · sáb 09:10  │                                                ◉ │  trilho de
│   │ Bassinage             │              ╭───────╮  ← etiqueta             ● │  capítulos
│   │ ~10 min · Receita base│      ┌──┐    │ 18 g  │                         ● │  (pontos 12 px,
│   │                       │      │  │~~~~╰───────╯                         ● │   alvo 32 px)
│   │ • Adicione os 18 g…   │      └──┘  ╭─────────╮                         ● │
│   │ • Só coloque mais…    │           (   tigela  )                        ● │
│   │ • Se ficar pegajosa…  │════════════╰─────────╯═══════════════ bancada ══ │  ← 62% da altura
│   │                       │                                                  │
│   │ [ ☐  Feito ]  Próxima↓│                     (plano P: pano, pote)        │
│   └───────────────────────┘                                                  │
└──────────────────────────────────────────────────────────────────────────────┘
  cartão: 440 px, sticky a 96 px do topo, margem esquerda 64 px
  assunto da cena: centro a ~62% da largura (fora da área do cartão)
```

### Mobile (retrato; referência 375×812)

```
┌─────────────────────────┐
│ NP   800 g · 5 pizzas ◐ │  barra 52 px
├─────────────────────────┤
│   (janela)              │
│        ╭──────╮         │   a cena ocupa a metade de cima;
│   ┌─┐~~│ 18 g │         │   assunto centralizado na largura,
│   └─┘  ╰──────╯         │   linha da bancada a ~48% da altura
│      ╭─────────╮        │
│═════(  tigela   )═══════│
│┌───────────────────────┐│
││ ETAPA 03 · sáb 09:10  ││   cartão em fluxo normal (não sticky):
││ Bassinage             ││   chega pela parte de baixo e sobe
││ • Adicione os 18 g…   ││   com a rolagem, cobrindo a cena
││ • Só coloque mais…    ││
││ [ ☐  Feito          ] ││   "Feito": 56 px de altura, largura total
│└───────────────────────┘│
├─────────────────────────┤
│ ‹  03/13 · Bassinage  › │  barra inferior 56 px: anterior, índice, próxima
└─────────────────────────┘
```

**Enquadramento próprio no retrato.** O SVG de cada cena tem 1600×900 e é sempre dimensionado para cobrir a tela (`largura = max(100vw, 177,78vh)`). No retrato isso deixa visível só a faixa central de ~420 unidades. Regras de composição: (1) o assunto de cada cena cabe numa caixa de 400×420 unidades centrada em x = 930; (2) adereços de contexto ficam fora dessa caixa e só aparecem no desktop; (3) no retrato o SVG sobe 12vh, **o mesmo valor em todos os ladrilhos** (no protótipo, uma abertura com horizonte próprio abriu uma emenda visível na primeira passagem; corrigido) para o assunto ficar na metade de cima; a bancada continua em CSS até o pé da tela; (4) etiquetas ficam dentro da caixa do assunto, com texto de no mínimo 30 unidades (≈ 27 px no celular). Parede e bancada são CSS do ladrilho, não do SVG: é isso que garante emenda perfeita em qualquer proporção.

Paisagem baixa (altura < 520 px): cartão com 60% da largura, cena estática atrás, trilho escondido.

---

## 6. Design system

### Cores de interface

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--paper` | `#F7EFE1` | `#231912` | fundo dos cartões e do epílogo |
| `--paper-2` | `#EFE3CF` | `#2E2118` | campos, faixas internas |
| `--ink` | `#2A1D14` | `#F4E8D4` | texto (13,9:1 / 13,5:1 sobre `--paper`) |
| `--ink-2` | `#5F4A3A` | `#CDBBA2` | texto secundário (≥ 6,5:1) |
| `--line` | `#D8C6AA` | `#4A382B` | bordas |
| `--tomato` | `#B8321A` | `#FF9272` | ação principal, números em destaque (5,6:1 / 7,6:1) |
| `--on-tomato` | `#FFF7EC` | `#2A0F06` | texto sobre botão principal |
| `--basil` | `#2C6A3E` | `#8FD19A` | feito, faixa de ponto |
| `--ember` | `#A85A0C` | `#F2A64A` | tempo, forno, "agora" |
| `--cold` | `#3F6F86` | `#9CC9DD` | geladeira |
| `--focus` | `#1F5FBF` | `#9CC2FF` | anel de foco 3 px |

### Cores de cena (parede/bancada por momento; a borda direita de um é a esquerda do seguinte)

| Momento | Parede claro | Parede escuro | Bancada claro | Bancada escuro |
|---|---|---|---|---|
| Fim de tarde (abertura) | `#E2C39B` | `#4B3828` | `#B98556` | `#4E3423` |
| Anoitecer | `#B88865` | `#35271F` | `#9A6A45` | `#3C281C` |
| Noite | `#4A3A3C` | `#17121A` | `#5C3E2C` | `#231712` |
| Manhã | `#EADFC8` | `#4F463C` | `#C99A66` | `#57402C` |
| Tarde dourada | `#E3BE8C` | `#4D3824` | `#BE8850` | `#4F3521` |
| Brasa (forno) | `#34201A` | `#150C09` | `#4A2C1E` | `#1F130D` |
| Frio (geladeira) | `#B9D2DC` | `#1E3340` | `#8FAFBD` | `#18272F` |

No escuro, os objetos recebem `filter: brightness(.62) saturate(.9)`; fontes de luz (luminária, janela, resistências, luz da geladeira) ficam fora desse grupo e não escurecem. É a mesma cena à noite, não outra ilustração.

### Tipografia
Mantidas as três famílias do site (já pagas em bytes e testadas): **Fraunces** (títulos, itálico para ênfase, eixo óptico), **Atkinson Hyperlegible Next** (texto), **JetBrains Mono** (números, tabular). Dentro do SVG, as etiquetas usam JetBrains Mono.

| Papel | Desktop | Mobile | Peso / entrelinha |
|---|---|---|---|
| Pergunta de abertura | Fraunces 64 | 38 | 560 / 1,02 |
| Título de etapa | Fraunces 34 | 28 | 560 / 1,1 |
| Capítulo (Dia N) | Fraunces itálico 22 | 20 | 400 |
| Corpo | Atkinson 18 | 18 | 400 / 1,5 |
| Sobrelinha, selos | Atkinson 13 caixa alta, tracking .08em | 13 | 700 |
| Quantidade no texto | JetBrains Mono 18 | 18 | 700 |
| Quantidade em destaque (abertura, timer) | Mono 44 / 72 | 36 / 56 | 700 |

Escala: 13 · 15 · 18 · 22 · 28 · 34 · 48 · 64. Espaçamento base 4: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96. Raios: 6 (campos), 14 (cartão), 999 (chips). Sombra única do cartão: `0 18px 40px -18px rgb(30 15 5 / .45)`.

### Componentes
- **Pergunta de abertura.** `<form>` com `<fieldset>` de receita (2 rádios em forma de cartão, 72 px de altura, nome + uma linha: "3 dias · 64% · pré-fermento") e `<fieldset>` de quantidade: controle segmentado "Farinha | Pizzas", stepper − valor + (botões 56 px, campo numérico editável), linha de resumo viva ("≈ 5 pizzas de 270 g"). Botão principal "Começar" (56 px, tomate). Abaixo: "O resto usa o padrão da v1.0. Dá para ajustar a qualquer momento."
- **Cartão de etapa.** Papel opaco, 440 px (desktop) ou largura total menos 24 px (mobile). Cabeça: sobrelinha "Etapa 03" + horário do cronograma + selo "agora"; título; chips de tempo e origem (Receita base, Adaptado, Lição 1ª fornada). Corpo: lista. Dica: bloco com filete lateral (âmbar para dica, tomate para aviso). Pé: checkbox "Feito" (56 px) + "Próxima ↓".
- **Chip de quantidade** (no texto): mono 700 sobre `--paper-2`, `padding: 0 6px`, raio 6, não quebra linha. **Etiqueta de cena** (no SVG): papel pardo 2 tons, furo e barbante, rotação de 2–4°, texto mono.
- **Painel de ajustes.** `<dialog>` modal; folha inferior com alça (mobile, 88vh no máximo) ou gaveta direita de 420 px (desktop). Seções `<details>`: Massa (aberta), Fórmula, Ambiente e forno, Coberturas, Agenda, Receita (tabela), Preferências (movimento, tela acesa, limpar etapas, restaurar v1.0). Fecha com Esc, botão e toque fora.
- **Timer.** No celular o bloco do timer vem logo abaixo do título e sem o relógio grande (o tempo é lido no anel da cena e no mini-timer da barra), para os botões ficarem à vista junto com o forno. No cartão (desktop): tempo em mono 72/56, barra com faixas dourada e verde e marcas, mensagem de estado (`aria-live="polite"`, só nas trocas de faixa), Iniciar/Pausar (primário) e Zerar. Na cena: anel SVG em volta da boca do forno. Mini-timer na barra quando rodando e fora de vista.
- **Progresso e navegação de capítulos.** Desktop: trilho vertical à direita, um ponto por etapa agrupado por dia; ponto cheio = feito, anel = atual, âmbar = "agora" pelo horário; rótulo aparece em hover e foco. Mobile: barra inferior com ‹ anterior, "03/13 · título" (abre o índice em folha), próxima ›, e um filete de progresso no topo da barra.
- **Barra superior.** Marca, posição ("Dia 2 · etapa 03 de 13", só desktop), botão "Massa" com o resumo, tema, idioma. Fundo translúcido com `backdrop-filter` só no desktop; opaco no celular (custa caro em GPU fraca).

---

## 7. Estratégia de ilustração

**Sistema de construção.**
- Um `<svg>` de definições compartilhadas por página: gradientes de material (massa, cerâmica, vidro, metal, tomate, azeite), 2 filtros e os adereços como `<symbol>` (pote, tigela, jarra, saco, balança, panetto, etiqueta, forno).
- Cada cena é um `<svg viewBox="0 0 1600 900">` com três grupos: `.far` (janela, prateleira, luminária), `.sub` (assunto + etiquetas) e `.near` (objetos de primeiro plano, maiores e mais escuros). Parede e bancada **não** estão no SVG; são gradientes CSS do ladrilho.
- **Como parecer pintado sem ser pesado:** (1) formas com sombra própria em gradiente radial de 3–4 paradas com a luz vindo sempre do mesmo lado da cena; (2) sombra de contato elíptica sob cada objeto; (3) um filtro `#rough` (`feTurbulence` de baixa frequência + `feDisplacementMap` de escala 3–4) aplicado **ao grupo do assunto, uma vez por cena**, para tirar a perfeição vetorial das bordas; (4) pinceladas de realce (traços curtos semitransparentes) desenhadas à mão no código; (5) **um único grão de papel para a página inteira**: uma camada fixa com um SVG de ruído em `background-image`, opacidade 0,10–0,14, sem `mix-blend-mode`. O grão não se move com a cena, como numa transparência sobre o projetor, e custa uma rasterização.
- **Paleta limitada por cena:** 5 cores locais + 2 de luz. As cores locais dos materiais são constantes; quem muda é a parede, a bancada e a cor da luz (variáveis CSS).

**Parcimônia com filtros.** No máximo 1 grupo com `#rough` por cena; nenhum filtro em elemento que anima; um único `feGaussianBlur` (raio 7) é admitido no plano P e nas manchas de luz da janela, porque são camadas estáticas rasterizadas uma vez e depois só transladadas; brilhos são gradientes radiais, não blur. Sombra de cartão é `box-shadow`, não filtro. Em `(prefers-reduced-data)` ou aparelho com `deviceMemory ≤ 2`, o `#rough` é desligado por classe.

**Reaproveitamento.** Tigela, pote, jarra, panetto, bandeja, etiqueta e forno são símbolos usados em várias cenas (a tigela aparece em 4; o forno em 4). A continuidade vem daí: é a mesma tigela, vista do mesmo ângulo, só que com outra massa dentro. A New York troca rótulos e liga/desliga adereços.

**Orçamento.**
| Item | Limite |
|---|---|
| Definições compartilhadas | 10 KB (≈ 3 KB gzip) |
| Cada cena | 12 KB e 220 nós (≈ 3 KB gzip) |
| Página inteira (16 cenas, inline) | ≤ 200 KB de SVG (≈ 50 KB gzip) |
| Ladrilhos vivos ao mesmo tempo | 2 |
| Filtros por cena | 1 estático |

As cenas ficam inline no HTML pré-renderizado (precisam das variáveis CSS e das etiquetas `data-k`). O build injeta cada cena a partir de `src/scenes/<id>.svg`; `content-visibility` não é necessário porque ladrilhos não vivos estão em `display: none`.

**Claro e escuro.** Três alavancas, todas por variável: (1) cor da parede e da bancada; (2) `brightness/saturate` no grupo dos objetos; (3) opacidade dos halos de luz (luminária, janela, resistências), que sobem no escuro. Resultado: no claro, a noite do dia 1 é um anoitecer legível; no escuro, é noite de fato e a luminária passa a ser a protagonista.

---

## 8. Animações e microinterações (por prioridade)

| P | O quê | Como | Duração / easing | Movimento reduzido |
|---|---|---|---|---|
| 1 | Travelling entre cenas | `translate3d` ligado à rolagem (CSS view-timeline; JS como alternativa) | linear (é scrub; qualquer easing descola do dedo) | Sem travelling: figura estática no topo de cada etapa |
| 1 | Profundidade (planos F e P) | mesmo timeline, ±5% e ±10% | linear | Desligado |
| 2 | Vida da cena parada: bolhas, vapor, fio d'água, brasa | CSS `@keyframes` em `transform`/`opacity`, só em ladrilho vivo | 2,4–6 s, `ease-in-out`, loop; brasa 1,8 s alternada | Pausado no primeiro quadro |
| 2 | Chegada do cartão | nenhuma animação própria: ele rola com a página | — | Igual |
| 3 | Marcar "feito" | caixa preenche e o traço do check se desenha; ponto do trilho enche | 220 ms `cubic-bezier(.2,.8,.2,1)` | Troca de estado sem transição |
| 3 | Quantidade recalculada | o número faz um flash de fundo âmbar | 600 ms `ease-out` | Sem flash |
| 3 | Timer | anel avança a cada quadro; cor muda nas faixas; cornicione cresce | contínuo; troca de cor 300 ms | Anel avança em passos de 1 s; sem crescimento |
| 4 | Panetti surgindo na bandeja | escala 0,6 → 1 com atraso de 60 ms entre eles | 320 ms `cubic-bezier(.3,1.4,.5,1)` | Aparecem prontos |
| 4 | Abrir ajustes | folha sobe / gaveta entra | 280 ms `cubic-bezier(.2,.8,.2,1)`; fecha em 200 ms | Aparece sem deslocamento |
| 5 | "Ver o gesto" (coreografias do player) | GSAP sobre a cena, sob demanda | 6–10 s | Vira sequência de 3 quadros parados com legenda |
| 5 | Poeira de farinha na abertura | 12 partículas CSS | 8–14 s linear | Desligado |

Regras gerais: nada anima `width/height/top/left/filter`; nada dispara por rolagem além do travelling; nenhuma animação bloqueia interação; `will-change: transform` só nos ladrilhos vivos.

---

## 9. Acessibilidade e desempenho

**Semântica.** A jornada é `<ol>`; cada etapa é `<li id>` com `<article aria-labelledby>`, `<h3>`, `<ul>` de instruções. Capítulos são `<h2>` ("Dia 2 · mistura e divisão"). As cenas são `<figure aria-hidden="true">`: são reforço visual; tudo que elas dizem (quantidades, tempos) está no texto do cartão. Abertura é `<form>` com `<fieldset>/<legend>`. Ajustes é `<dialog>` com foco preso e devolvido. Timer anuncia só as trocas de faixa.

**Teclado.** Ordem: pular para a jornada → barra → abertura → etapas → epílogo → trilho. Trilho e barra inferior são links de âncora comuns. Espaço/PageDown rolam nativamente e a câmera acompanha. Foco visível de 3 px com contraste ≥ 3:1 sobre papel e sobre cena. Nenhum atalho de tecla única.

**Contraste.** Texto só sobre `--paper` (AA com folga, ver tokens). Barra superior: sobre a cena, tem fundo próprio de papel a 88% (desktop) ou opaco (mobile). Etiquetas de cena não contam como texto essencial, mas mantêm ≥ 7:1 (tinta sobre papel pardo).

**Movimento.** `prefers-reduced-motion` e o interruptor manual levam à versão estática completa. O travelling é lateral, linear, sem zoom nem rotação; a parte da tela que se move é o fundo, o texto fica estável.

**Desempenho.**
- **LCP:** é o título da abertura (texto) ou a cena de abertura (SVG inline, sem requisição). Fontes com `font-display: swap` e preload de Fraunces. Meta: ≤ 1,8 s em 4G lento.
- **CLS:** zero por construção: figuras são `position: fixed`, cartões têm altura definida pelo próprio texto pré-renderizado; números usam `tabular-nums`. Meta ≤ 0,02.
- **INP:** recalcular tudo é uma função pura + atualização de `textContent` em ~80 nós; meta ≤ 100 ms. O ouvinte de rolagem (só no fallback) é passivo e faz 2 escritas de `transform` por quadro, sem leitura de layout além de 2 `getBoundingClientRect`.
- **Sem repaint na rolagem:** só `transform` em camadas já rasterizadas; grão é uma camada fixa única; nada de `background-attachment`, `filter` animado, `backdrop-filter` no celular ou `box-shadow` em elemento que se move na cena. Ladrilhos fora de alcance não existem para o renderizador.
- **Peso:** remove a foto de cenário e seus 27 AVIF do caminho crítico (ficam só as fotos do Sobre, lazy). HTML por página ≈ 60–70 KB gzip com as cenas inline. GSAP passa a carregar sob demanda ("Ver o gesto").
- **Barra de URL no celular:** o palco usa `100lvh` e os cálculos de enquadramento usam `lvh`, para a cena não pular quando a barra recolhe.

**SEO / pré-render.** O texto de todas as etapas, as quantidades padrão, a tabela, as regras e o JSON-LD continuam no HTML estático gerado pelo `build.py`. As cenas não carregam texto essencial.

---

## 10. Critérios de aceitação e riscos

### Critérios verificáveis
1. **Abertura:** só receita + quantidade + começar. Alternar farinha/pizzas recalcula o resumo. Enter no campo começa.
2. **Sem scroll-jacking:** nenhum `preventDefault` em `wheel`/`touchmove`/`keydown` de rolagem; nenhum `scroll-snap` obrigatório; `scrollTo` programático só em resposta a clique. `window.scrollY` após N `wheel` de 100 px = N×100.
3. **Emenda:** no meio de qualquer passagem, a borda direita do ladrilho que sai e a esquerda do que entra coincidem (diferença ≤ 1 px) e a linha da bancada está na mesma altura, em 375, 768, 1440 e 1920 px.
4. **Quantidades:** para 800 g / padrão v1.0, as etiquetas e cartões mostram 400 / 0,8 / 400 (pré-fermento), 23 g de sal em 94 g de água, 18 g de bassinage, 5 × 270 g (massa total 1.348 g). Mudar a abertura muda tudo sem recarregar. Resultado idêntico ao `calc()` de produção.
5. **Movimento reduzido:** nenhuma figura `position: fixed`, nenhuma animação rodando, todas as etapas e ferramentas utilizáveis.
6. **Sem JS:** o HTML pré-renderizado mostra as 13 etapas com texto e quantidades padrão, em ordem.
7. **Retomar:** recarregar com progresso salvo mostra "Continuar na etapa NN"; `#s8` na URL abre na cena 07.
8. **Timer:** inicia, pausa, zera; faixas nas marcas de `recipe.json`; pede Wake Lock; continua contando com a aba em segundo plano (baseado em relógio, não em contagem de quadros).
9. **Contraste AA** em todo texto, claro e escuro; alvos ≥ 48 px nas ações de etapa.
10. **Desempenho:** LCP ≤ 2,0 s e CLS ≤ 0,02 (4G lento, CPU 4×); nenhum quadro > 32 ms durante uma passagem num Android intermediário; ≤ 2 ladrilhos com `display` ativo.
11. **Sem rolagem horizontal** de 320 a 1920 px. Console sem erros.

### Riscos e limitações honestas
- **Mãos.** A receita é gesto (dobrar, bolear, abrir) e mão humana pintada em SVG costuma sair mal. A proposta evita mãos e usa notação de giz (setas e cotas). Perde calor humano; ganha clareza. Se o dono quiser mãos, é trabalho de ilustrador, não de código.
- **"Pintado" em SVG tem teto.** Gradientes + deslocamento de borda + grão dão um guache digital convincente em objetos simples (tigela, pote, massa). Texturas ricas (miolo, queijo derretido, leopardatura, madeira com veio) ficam estilizadas. As cenas 12 e 13 são as mais difíceis de fazer bem. O protótipo mostra o nível alcançável sem ilustrador.
- **Produção.** São 17 cenas. O protótipo tem 5 mais a abertura. Estimo 2–4 h de desenho por cena no mesmo nível; a consistência entre cenas depende de respeitar a biblioteca de símbolos.
- **Comprimento da página.** 13 etapas × ~1,7 tela + interlúdios ≈ 28 telas no desktop. Compensado por retomar, trilho e barra inferior, mas quem só quer "a receita" vai achar longo: por isso a tabela completa fica no prólogo e nos ajustes, e a versão estática é mais curta.
- **Suporte a scroll-driven CSS.** Chromium e Safari recentes sim; Firefox estável ainda não por padrão. O fallback em JS é equivalente, mas roda na thread principal: em aparelho fraco pode atrasar um quadro em relação ao dedo.
- **Filtros no Safari.** `feDisplacementMap` em grupos grandes é mais lento no WebKit; pode ser preciso desligar o `#rough` no iOS ou trocar por bordas irregulares desenhadas no próprio path.
- **Camadas fixas no iOS.** `position: fixed` com `transform` ligado à rolagem é estável no Safari moderno, mas a barra de URL dinâmica precisa de teste em aparelho.
- **Enjoo.** Movimento lateral de tela cheia incomoda parte das pessoas mesmo sem a preferência do sistema ligada; por isso existe o interruptor "Movimento" visível nos ajustes.
- **Texto das etapas longas no celular.** Etapas com 5 itens + dica (02, 11) têm cartão mais alto que a tela: a cena fica coberta durante a leitura. É aceito: a cena é vista na chegada e na saída.
- **Fotos reais.** Perdem o papel de capa. Imagens OG também precisariam ser refeitas com a ilustração.
- **Etiquetas no tema escuro.** Elas escurecem junto com os objetos e o contraste da tinta sobre o papel pardo cai para perto de 4:1. Não é texto essencial (repete o cartão), mas vale separá-las numa camada com escurecimento menor.
- **Verificado no protótipo (Chrome 157 via CDP, capturas em `design/jornada/qa/`):** 1440×900 e 375×812 (emulação de dispositivo, DPR 2), claro e escuro, movimento reduzido, motor CSS e motor JS com a mesma posição de emenda (diferença 0 px), sem rolagem horizontal, console limpo, cálculo (800 g → 400/400/0,8, 23, 94, 18, 5 × 270; 7 pizzas → 1.122 g), feito + contagem, retomar, timer, diagnóstico. **Não verificado:** Safari/iOS, Firefox, aparelho real, leitor de tela, taxa de quadros durante a rolagem, LCP/CLS/INP, Wake Lock, teclado ponta a ponta, 768 e 1920 px.
- **Não coberto por esta rodada:** New York e inglês no protótipo, epílogo completo, interlúdios, "Ver o gesto", integração com o `build.py`.
