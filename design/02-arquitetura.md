# 02 · Arquitetura técnica do redesign "Luce di Forno"

Plano para quem vai implementar. Leia antes: `design/01-direcao-de-arte.md` (o *quê*) e `design/mockup/index.html` (referência visual). Este documento diz *como*, e onde ele contradiz o doc 01, **vale este documento**. A seção 2 lista cada contradição.

Branch: `redesign-imersivo`. Servidor local: `.claude/launch.json` → `napoliprotocol` (porta 8766, serve `docs/`). Build: `python3 build.py` (requer Chrome em `/Applications/Google Chrome.app`).

---

## 1. Princípios

1. **A ferramenta continua igual.** IDs, chaves de `localStorage` (`<ls>:p`, `<ls>:done`, `np-theme`, `np-lang`), cálculo, cronograma, timer, diagnóstico, JSON-LD e pré-render não mudam de comportamento. O redesign muda markup de layout, CSS e um script novo e pequeno.
2. **A câmera é CSS.** Cada tomada vira um conjunto de variáveis CSS geradas pelo build. O JavaScript só troca `data-take` no `.scene`. Sem JS ou no pré-render, a página mostra o herói enquadrado corretamente.
3. **Nenhum ouvinte de scroll.** Só `IntersectionObserver`, `matchMedia` e CSS (`animation-timeline` atrás de `@supports`).
4. **Só `transform`/`translate`/`scale`/`opacity` animam.**
5. **Cada etapa do plano (§8) termina com o build passando e a página utilizável.**

---

## 2. Viabilidade: o que entra, o que muda, o que sai

O conceito do doc 01 é viável no stack (Python + HTML estático + CSS + ~2 KB de JS). Mas o doc tem quatro problemas técnicos que este plano corrige:

1. **Orçamento de bytes x tamanho servido.** O doc pede `sizes="130vw"` e arquivo de 3840 px. Com isso, em 1440@2x o navegador pede 3744 px e baixa o arquivo de 3840 (teto de 650 KB), o que estoura o próprio orçamento de 450 KB. Medido aqui com `oro`:

   | Arquivo | Tamanho |
   |---|---|
   | AVIF q52, 1920 | 172 KB |
   | AVIF q52, 2560 | 245 KB |
   | AVIF q52, 3200 | 317 KB |
   | AVIF q45, 3200 | 260 KB |
   | AVIF q52, recorte mobile 1600 | 160 KB |
   | AVIF q45, recorte mobile 1600 | 118 KB |

   **Decisão:**
   - Teto de 3200 px.
   - `sizes` calculado sobre a largura de layout da camada, sem contar a escala da tomada.
   - As tomadas a 1,30× ficam um pouco mais moles. Isso é aceitável porque estão sob véu.
2. **A câmera em JS depende de `naturalWidth` e de `resize`.** No pré-render (`file://`), `/img/...` dá 404, `naturalWidth` é 0 e `decode()` rejeita. **Decisão:** câmera em CSS puro (§3.2).
3. **O mobile usa uma "caixa virtual do original com o recorte posicionado dentro".** É complexo e frágil. **Decisão:** o build converte os focos mobile para coordenadas *do recorte*. Em tempo de execução o recorte é uma imagem como outra qualquer.
4. **A máscara de `bleed` é alternada no `<img>`.** `mask-image` não anima, então a troca da tomada `hero` para `tempo` daria um salto. **Decisão:** a dissolução de borda vira um pseudo-elemento com gradiente dentro da camada transformada, com `opacity` animável (§3.2).

### 2.1 Itens do doc 01: decisão por item

| Item do doc 01 | Decisão | Motivo |
|---|---|---|
| Cenário fixo + folhas opacas + janelas (§3, §8) | **Entra** | É o conceito, e é barato (camada fixa + fluxo normal) |
| Tomadas com foco/âncora/escala (§7.3–7.4) | **Entra, em CSS** | Valores do doc mantidos. NY precisa de ajuste fino de ±3 pontos |
| Troca de tomada na mesma foto: 1,4 s | **Entra** (P1) | `translate`/`scale` com `transition` |
| Troca entre fotos: fusão de 700 ms | **Entra** (P1) | `opacity`. Foto inativa reposiciona invisível (§3.2) |
| Topbar transparente → sólida | **Entra** (P1) | Observador no herói, sem scroll. **Padrão sólido**; transparente só com JS |
| Check "Concluído" com recolher | **Entra** (P1) | CSS |
| Timer escuro nos dois temas | **Entra** | Remapeamento local de tokens |
| Painel sticky no cap. I; player sticky no cap. III (≥ 1100 px) | **Entra** | Player sticky só com altura ≥ 760 px (senão não cabe) |
| Sincronia player ↔ etapa em foco ("Bancada") | **Entra, simplificada** | Sincroniza sempre que `!playing`, com debounce de 150 ms. Ao pausar ou terminar o filme, o modo volta para `bench`. **Corta-se** a regra "volta para Bancada depois de rolar 1,5 viewport" |
| Botão "Ver o gesto" por etapa (< 1100 px) | **Entra** | Barato. Chave nova `js.player.see` |
| Ilustrações `.illo` ocultas ≥ 1100 px | **Entra** | CSS |
| Entrada do herói em cascata (P2) | **Entra, sem o `h1` e sem a foto** | Foto e `h1` são candidatos a LCP: animar a opacidade deles atrasa o LCP. Só pílula, lead, assinatura e seletor entram em cascata |
| Fusão de 400 ms da foto do herói na carga | **Cortado** | Mesmo motivo (LCP). A foto aparece progressivamente sobre `--scene` |
| Texto da janela: entra uma vez com IO | **Trocado** | Vira `animation-timeline: view()` dentro de `@supports`, sem JS e esfregado. Sem suporte, fica estático. Etapa opcional (§8, etapa 12) |
| Avanço do herói esfregado (escala +5% no cenário, texto some) | **Adiado, opcional** | Escalar o cenário conflita com a transformação da câmera (exigiria wrapper) e o ganho é pequeno. Se entrar: só o texto do herói (opacidade e −24 px), na etapa 12, deletável |
| Fio esquerdo na etapa em foco | **Entra só ≥ 1100 px** | Vem do mesmo observador da sincronia do player |
| KPIs/tabela piscam ao recalcular (P2) | **Adiado** | Exige comparar valores antigos em `render()`; não é essencial |
| `scale(.97)` nos botões (P2) | **Entra** | CSS, 80 ms |
| P3: deriva de 8 s, pulso do "próximo evento", entrada da resposta do diagnóstico | **Cortado** | Custo > benefício |
| Palco do player escuro nos dois temas | **Cortado** | As cenas pintam com `var(--ink)` direto no palco (centro do relógio, cota em `open`, termômetro, "teste da janela"). No tema claro o palco escuro esconderia esses traços. O palco segue o tema |
| Arquivo de 3840 px; `sizes` 130vw/200vw | **Cortado** | Ver item 1 acima. Teto de 3200 px |
| Cache por hash do original | **Cortado** | `--scene` é manual e raro; o manifesto basta |
| JPG progressivo | **Cortado** | `sips` não gera progressivo; o JPG é só fallback |
| Originais no repositório ou em Git LFS | **Decidido** | Originais ficam fora do git (já no `.gitignore`); derivadas são commitadas |
| CLS ≤ 0,02 (doc 01 §10.26) | **Trocado** | Meta do projeto: CLS < 0,1 (alvo interno ≤ 0,05) |
| Critério 12 ("≥ 2560 px em 1440@2x") | **Mantido** | Com `sizes=100vw` o navegador escolhe 3200 |
| Critério 13 (mobile 3× recebe `-m-`) | **Mantido** | Garantido por `<source media>` |
| Critério 15 (iOS: a foto não pula ao recolher a barra) | **Mantido** | Altura do cenário em `lvh` |
| Critério 23 (foto do herói também no Sobre) | **Já atendido** na napolitana (`oro` em `photos.about`) | Na NY, `nyslice` já está em `about` |

---

## 3. Estratégia de cenário, scroll e transições

### 3.1 Camadas

```
body (background: var(--scene))
├─ a.skip                       link "pular para a receita"
├─ div.scene[aria-hidden]       position:fixed; z-index:0; altura 100lvh; filho direto de <body>
│   ├─ div.ph.ph-<foto1>        camada transformada (uma por foto do cenário)
│   │   └─ picture > img
│   └─ div.ph.ph-<foto2>
├─ header.topbar                position:fixed; z-index:20
├─ main#main                    position:relative; z-index:1
│   ├─ section.hero[data-take=hero]
│   ├─ section.sheet#receita
│   ├─ section.win[data-take=tempo]
│   ├─ section.sheet#cronograma
│   ├─ section.win[data-take=gesto]
│   ├─ section.sheet#passos  (contém div#assistir)
│   ├─ section.win[data-take=fogo]
│   ├─ section.sheet#forno
│   ├─ div.gap  (20 px de cenário)
│   └─ div.sheet  (section#regras + section#sobre)
└─ footer.fin[data-take=fim]     position:relative; z-index:1
```

Regras duras:
- **Nada de `overflow:hidden`** em `.sheet`, nem em qualquer ancestral do painel ou do player (ambos são sticky). Se precisar recortar, use `overflow:clip`.
- **Sem `background-attachment:fixed`.**
- `.scene` não recebe evento (`pointer-events:none`).

### 3.2 Câmera em CSS

Modelo do doc 01 §7.3, com `A` = largura/altura **da variante servida** (desktop ou recorte mobile) e foco já convertido para essa variante.

```css
:root{ --vh:100vh; }
@supports (height:100lvh){ :root{ --vh:100lvh; } }

.scene{position:fixed;left:0;top:0;width:100%;height:100vh;height:100lvh;z-index:0;overflow:hidden;
  background:var(--scene);pointer-events:none}
.scene::after{content:"";position:absolute;inset:0;background:var(--scene);opacity:var(--bd-dim)}   /* escurecimento do tema */

.ph{position:absolute;left:0;top:0;transform-origin:0 0;
  --W0:max(100vw, calc(var(--vh) * var(--A)));
  --W:calc(var(--W0) * var(--s));
  --H:calc(var(--W) / var(--A));
  width:var(--W0);height:calc(var(--W0) / var(--A));
  translate:
    clamp(var(--txmin, calc(100vw - var(--W))), calc(var(--ax) * 100vw - var(--fx) * var(--W)), var(--txmax, 0px))
    clamp(var(--tymin, calc(var(--vh) - var(--H))), calc(var(--ay) * var(--vh) - var(--fy) * var(--H)), var(--tymax, 0px));
  scale:var(--s);
  opacity:0;
  will-change:translate,scale,opacity;
  /* inativa: some em 700 ms e só depois reposiciona (instantâneo e invisível) */
  transition:opacity .7s linear, translate 0s linear .7s, scale 0s linear .7s}
.ph picture,.ph img{display:block;width:100%;height:100%}
.ph::before,.ph::after{content:"";position:absolute;inset:0;pointer-events:none;transition:opacity 1.4s var(--ease-cam)}
.ph::before{background:linear-gradient(90deg,var(--scene) 0,rgb(var(--scene-rgb)/0) 26%);opacity:var(--bl,0)}   /* bleed l */
.ph::after{background:linear-gradient(180deg,var(--scene) 0,rgb(var(--scene-rgb)/0) 30%);opacity:var(--bt,0)}   /* bleed t */
.scene.cut .ph,.scene.cut .ph::before,.scene.cut .ph::after{transition:none!important}
```

O build gera um `<style id="scene-css">` por página com:

1. **Proporção por foto e por breakpoint.** O breakpoint é exatamente o do `<source media>`:

   ```css
   .ph-oro{--A:1.3333}
   @media (max-width:820px){ .ph-oro{--A:0.9332} }
   ```

2. **Variáveis por tomada.** A tomada ativa da foto também liga a opacidade e a transição de câmera:

   ```css
   .scene:not([data-take]) .ph-oro, .scene[data-take=hero] .ph-oro{
     --fx:.45;--fy:.48;--ax:.64;--ay:.52;--s:1;--txmin:-99999px;--txmax:99999px;--bl:1;
     opacity:1;transition:translate 1.4s var(--ease-cam),scale 1.4s var(--ease-cam),opacity .7s linear}
   .scene[data-take=tempo] .ph-oro{--fx:.56;--fy:.80;--ax:.68;--ay:.38;--s:1.3; opacity:1; transition:…}
   @media (max-width:820px){ … mesmas regras com os valores "m" convertidos … }
   ```

   - `bleed:"l"` → `--txmin:-99999px;--txmax:99999px;--bl:1`.
   - `bleed:"t"` → `--tymin:-99999px;--tymax:99999px;--bt:1`.
   - Sem bleed → as variáveis não são emitidas e valem os padrões de `clamp`.

3. **Regra da foto inativa.** Para cada tomada `T` e cada foto `P` que **não** aparece em `T`, emita para `P` as variáveis da **próxima** tomada (na ordem `hero, tempo, gesto, fogo, fim`) que usa `P`. Se não houver próxima, use a última anterior. Sem `opacity:1`. Assim:
   - a foto que sai não se mexe enquanto some (a transição dela é atrasada em 0,7 s);
   - a foto que entra já está no enquadramento final, como pede o doc 01 ("a nova foto nasce no enquadramento final").
   - **Toda** regra da tomada `hero` usa o seletor duplo `.scene:not([data-take]) …, .scene[data-take=hero] …`. Isso vale também para as regras de foto inativa, que pré-posicionam a foto secundária.

**Pré-render e sem JS:** `.scene` não tem `data-take`, então vale o seletor `:not([data-take])`, que é o herói. Nada é escrito em `style=""`.

**Reduced motion:** a regra global zera as transições (§3.5), e o JS muda o gatilho para fora de vista (§3.3).

### 3.3 `src/scene.js` (novo, ≤ 2 KB minificado, inline)

Responsabilidades e nada mais:

```js
(function(){
  if (location.search.includes('prerender')) return;              // nada pode ir para o HTML gravado
  const sc = document.querySelector('.scene'); if (!sc || !('IntersectionObserver' in window)) return;
  const ORDER = ['hero','tempo','gesto','fogo','fim'];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const marks = [...document.querySelectorAll('[data-take]')];     // em ordem do DOM
  const on = new Set(); let cur = 'hero'; sc.dataset.take = cur;

  function set(t){
    if (t === cur) return;
    if (Math.abs(ORDER.indexOf(t) - ORDER.indexOf(cur)) > 1) {      // salto por âncora: troca seca
      sc.classList.add('cut'); requestAnimationFrame(() => requestAnimationFrame(() => sc.classList.remove('cut')));
    }
    cur = t; sc.dataset.take = t;
  }
  // "intersectando" = topo do marcador acima de 90% do viewport (ou 150% com reduced motion: troca fora de vista).
  // A margem superior gigante faz marcadores que ficaram acima da tela continuarem "dentro": sobrevive a saltos por âncora.
  const io = new IntersectionObserver(es => {
    es.forEach(e => e.isIntersecting ? on.add(e.target) : on.delete(e.target));
    let t = 'hero'; for (const m of marks) if (on.has(m)) t = m.dataset.take;
    set(t);
  }, { rootMargin: reduced ? '100000px 0px 50% 0px' : '100000px 0px -10% 0px' });
  marks.forEach(m => io.observe(m));

  // Fotos secundárias: carregam quando o marcador que as usa está a 1,5 viewport
  const lazy = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; lazy.unobserve(e.target);
    const ph = sc.querySelector('.ph-' + e.target.dataset.photo); if (!ph) return;
    ph.querySelectorAll('[data-srcset]').forEach(s => { s.srcset = s.dataset.srcset; s.removeAttribute('data-srcset'); });
    const img = ph.querySelector('img[data-src]'); if (img) { img.src = img.dataset.src; img.removeAttribute('data-src'); }
  }), { rootMargin: '100000px 0px 150% 0px' });   // margem superior gigante: carrega também após salto por âncora ou deep link (#sobre)
  document.querySelectorAll('[data-photo]').forEach(m => lazy.observe(m));

  // Topbar transparente só enquanto o herói está sob ela
  const bar = document.querySelector('.topbar'), hero = document.querySelector('.hero');
  if (bar && hero) new IntersectionObserver(([e]) => bar.classList.toggle('on-hero', e.isIntersecting),
    { rootMargin: '-70px 0px 0px 0px' }).observe(hero);
})();
```

Observação: `loading="lazy"` **não** adia uma imagem dentro de camada fixa que está no viewport, mesmo com opacidade 0. Por isso a foto secundária usa troca de `data-srcset`.

### 3.4 Outros movimentos (CSS)

| Movimento | Implementação |
|---|---|
| Topbar | `.topbar` é sólida por padrão (`--surface` a 92%, blur 10 px). `.topbar.on-hero`: fundo transparente, `color:var(--scene-ink)`, `--focus:var(--oro)`. `transition:background-color .25s, color .25s, box-shadow .25s` |
| Entrada do herói | `@keyframes rise{from{opacity:0;translate:0 16px}}` em `.hero .recipes, .hero .pill, .hero .lead, .hero .byline, .hero .qcard`, 500 ms `--ease-ui`, `animation-delay` de 0/60/120/180/240 ms, `animation-fill-mode:backwards`. **`h1` e foto sem animação** |
| Etapa concluída | `.step.done{opacity:.62}` + `.step.done .body>:not(.step-top){display:none}`; `.check .box` 180 ms |
| Fio da etapa em foco (≥ 1100 px) | `.step{border-left:3px solid transparent;transition:border-color .25s}` `.step.cur{border-left-color:var(--accent)}` |
| Botões | `:active{scale:.97}` com `transition:scale 80ms` |
| Texto de janela, esfregado (etapa 12, opcional) | `@supports (animation-timeline:view()){ @media (prefers-reduced-motion:no-preference){ .win .wrap>*{animation:rise linear both;animation-timeline:view();animation-range:entry 10% cover 35%} } }` |

Rolagem por âncora: mantenha `html{scroll-behavior:smooth;scroll-padding-top:72px}` e desligue com reduced motion. Sem scroll suave via JS.

### 3.5 Reduced motion

```css
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{transition:none!important;animation:none!important}
  html{scroll-behavior:auto}
}
```

O `player.js` já respeita `reduced` (mostra o quadro final). O `scene.js` troca as tomadas com 50% de margem abaixo do viewport, fora de vista. Layout, fotos e véus ficam idênticos.

---

## 4. Pipeline de imagens e carregamento

### 4.1 Dados

`src/photos/photos.json`: as quatro fotos de cenário ganham três campos.

| Campo | Formato | Observação |
|---|---|---|
| `ow`, `oh` | dimensões do original | |
| `crop_d` | `[x0, y0, w, h]` em % do original | Opcional; padrão `[0,0,100,100]` |
| `crop_m` | `[x0, y0, w, h]` em % do original | Obrigatório |

Os demais campos ficam como estão; `w`/`h` continuam sendo os das figuras de 1400 px.

| Chave | `ow` × `oh` | `crop_d` | `crop_m` |
|---|---|---|---|
| `oro` | 5712 × 4284 | — | `[0,0,70,100]` |
| `leopard` | 4000 × 3000 | — | `[10,0,60,100]` |
| `nyslice` | 4032 × 3024 | — | `[0,30,70,70]` |
| `nyfold` | 3024 × 4032 | `[0,28,100,56]` | `[0,0,100,100]` |

### 4.2 Geração: `python3 build.py --scene`

Função nova `scene_images()` em `build.py`, chamada só com a flag `--scene`. Para cada foto que tem `crop_m` e cujo original `src/photos/originals/<k>-orig.jpg` existe:

1. **Converter para sRGB.** Três originais são Display P3. O `cwebp` descarta ICC, então converter antes evita cores diferentes entre formatos.

   ```
   sips -m "/System/Library/ColorSync/Profiles/sRGB Profile.icc" -s format png <orig> --out <tmp>/<k>-srgb.png
   ```

2. **Recortar e redimensionar com `cwebp`.** Não use `sips --cropOffset`: testado aqui, ele **ignora o recorte quando há deslocamento**. Faça o recorte via WebP sem perdas e devolva PNG:

   ```
   cwebp -quiet -lossless -z 0 -exact -crop <x> <y> <w> <h> -resize <W> 0 <tmp>/<k>-srgb.png -o <tmp>/c.webp
   dwebp -quiet <tmp>/c.webp -o <tmp>/<k>-<v>-<W>.png
   ```

   - `x`, `y`, `w`, `h` em pixels, `round(pct/100 × ow|oh)`.
   - Não amplie: pule larguras maiores que a do recorte.

3. **Codificar.**

   | Formato | Comando |
   |---|---|
   | AVIF | `avifenc -q 48 -s 4 -y 420 <png> <out>.avif` |
   | WebP | `cwebp -quiet -q 76 -m 6 -sharp_yuv <png> -o <out>.webp` |
   | JPG | `sips -s format jpeg -s formatOptions 78 <png> --out <out>.jpg` |

4. **Variantes:**

   | Variante | Larguras | AVIF | WebP | JPG |
   |---|---|---|---|---|
   | `d` (desktop) | 1280, 1920, 2560, 3200 | todas | 1280, 1920, 2560 | 1920 |
   | `m` (recorte mobile) | 800, 1200, 1600 | todas | todas | 1200 |

5. **Saída** em `src/photos/scene/<k>-<v>-<W>.<fmt>`, mais o manifesto `src/photos/scene/manifest.json`:

   ```json
   {"oro":{"d":{"crop":[0,0,100,100],"A":1.3333,"files":[{"w":1280,"h":960,"fmt":"avif","bytes":98765}, …]},
           "m":{"crop":[0,0,70,100],"A":0.9332,"files":[…]}}, …}
   ```

6. **Tetos de peso.** Imprima uma tabela de pesos e **avise** (não falhe) quando passar destes tetos:

   | Arquivo | Teto |
   |---|---|
   | AVIF `d-1920` | 190 KB |
   | AVIF `d-3200` | 320 KB |
   | AVIF `m-1200` | 120 KB |
   | AVIF `m-1600` | 180 KB |

   Se passar, baixe `-q` de 4 em 4 só para aquela foto. Para isso, aceite `"q":{"avif":44}` opcional em `photos.json`.

7. **Original ausente:** imprima `skip <k>: original ausente` e siga.

O build normal (sem `--scene`):
- **Falha** se uma foto usada em `scene.takes` não tiver entrada no manifesto ou arquivo em disco.
- Copia `src/photos/scene/*` para `docs/img/scene/`. O loop atual em `main()` só copia `src/photos/*.jpg` de primeiro nível, então é preciso um `copytree`/loop próprio.

Peso total das derivadas: cerca de 7–9 MB em `src/photos/scene/`, mais a cópia em `docs/`. Aceito. Commitar `src/photos/scene/**`. Nunca commitar `src/photos/originals/`.

### 4.3 Markup da camada (gerado pelo build)

Foto do herói (`oro` na napolitana):

```html
<div class="ph ph-oro">
  <picture>
    <source media="(max-width: 820px)" type="image/avif" srcset="/img/scene/oro-m-800.avif 800w, /img/scene/oro-m-1200.avif 1200w, /img/scene/oro-m-1600.avif 1600w" sizes="calc(100vh * 0.9332)">
    <source media="(max-width: 820px)" type="image/webp" srcset="…-m-800.webp 800w, …-m-1200.webp 1200w, …-m-1600.webp 1600w" sizes="calc(100vh * 0.9332)">
    <source media="(max-width: 820px)" srcset="/img/scene/oro-m-1200.jpg 1200w" sizes="calc(100vh * 0.9332)">
    <source type="image/avif" srcset="/img/scene/oro-d-1280.avif 1280w, …-d-1920.avif 1920w, …-d-2560.avif 2560w, …-d-3200.avif 3200w" sizes="100vw">
    <source type="image/webp" srcset="…-d-1280.webp 1280w, …-d-1920.webp 1920w, …-d-2560.webp 2560w" sizes="100vw">
    <img src="/img/scene/oro-d-1920.jpg" width="1920" height="1440" alt="" decoding="async" fetchpriority="high">
  </picture>
</div>
```

- **`sizes`:**
  - Desktop: `100vw`. A camada tem `W0 = max(vw, vh·A)` e, em paisagem, `vw` domina.
  - Mobile: `calc(100vh * A_m)`. Em retrato, `vh·A` domina.
  - O maior candidato mobile é 1600, então telas 3× recebem o arquivo de 2×.
- **Foto secundária** (`leopard`, `nyfold`): mesmo markup, mas `srcset` → `data-srcset`, `<img data-src="…-d-1920.jpg">` sem `src`, sem `fetchpriority`, `loading` omitido. O `scene.js` promove o carregamento.
- **Ordem das camadas:** a foto do herói primeiro, depois as demais na ordem do primeiro uso.

### 4.4 Preload do herói (no `{{HEAD}}`, antes do `<link>` das fontes)

```html
<link rel="preload" as="image" type="image/avif" fetchpriority="high" media="(max-width: 820px)"
      imagesrcset="(idêntico ao srcset do <source> AVIF mobile)" imagesizes="calc(100vh * 0.9332)">
<link rel="preload" as="image" type="image/avif" fetchpriority="high" media="(min-width: 821px)"
      imagesrcset="(idêntico ao srcset do <source> AVIF desktop)" imagesizes="100vw">
```

- **Obrigatório:** `imagesrcset`/`imagesizes` são gerados pela **mesma função** que gera os `<source>`. Qualquer diferença faz o navegador baixar duas vezes.
- Sem preload de WebP/JPG: navegadores sem AVIF ignoram o preload por causa do `type`.

### 4.5 Fotos das figuras (etapas e Sobre)

Ficam como hoje (`figure()`: JPG 800/1400, `loading="lazy"`, `width`/`height`). Única mudança: o crédito passa a ser gerado por `credit_html()` (§5.4). AVIF/WebP nas figuras fica **adiado** (fora do primeiro viewport, baixo ganho).

### 4.6 Orçamento por página (verificar na etapa 11)

| | Mobile 390×844 @3x | Desktop 1440×900 @2x |
|---|---|---|
| Imagem no primeiro viewport | ≤ 200 KB (`m-1600.avif`) | ≤ 330 KB (`d-3200.avif`) |
| Teto doc 01 | 260 KB | 450 KB |
| Segunda foto de cenário (lazy) | ≤ 180 KB | ≤ 330 KB |
| Fontes (Google, woff2) | ≤ 160 KB | ≤ 160 KB |
| JS de terceiros | só GSAP 3.12.2 (~70 KB gz) | idem |
| JS próprio inline | sem three.js; `scene.js` ≤ 2 KB | idem |

---

## 5. Componentes, contratos e markup

### 5.1 Arquivos

| Arquivo | Ação |
|---|---|
| `src/world3d.js` | **apagar** |
| `src/style-3d.css` | **apagar** (depois de migrar o que não é 3D, §6) |
| `src/style.css` | **reescrever** com os tokens do doc 01 §6 e os componentes deste plano |
| `src/scene.js` | **novo** (§3.3) |
| `src/template.html` | reestruturar (§5.2) |
| `src/player.js` | API `NP.player`, sincronia, botão "Ver o gesto", tokens (§5.5) |
| `build.py` | remover 3D; `--scene`; validação; gerar cena, preload, janelas, créditos, `H1`; pré-render endurecido; raiz/404/aposentadas |
| `src/photos/photos.json` | campos `ow`, `oh`, `crop_d`, `crop_m` |
| `src/photos/scene/` | **novo**, derivadas + `manifest.json` (commitados) |
| `src/recipes/*/recipe.json` | bloco `scene` |
| `src/recipes/*/{pt,en}.json` | bloco `scene` (textos das janelas) |
| `src/i18n/{pt,en}.json` | `chap.1`…`chap.6`, `nav.skip`, `foot.bgphoto`, `js.player.see` |
| `README.md` | trocar a seção 3D |
| `src/player-stage.svg`, `src/illustrations.js` | sem mudança |

### 5.2 Estrutura do `template.html` (esqueleto; ids existentes preservados)

```html
<body>
<a class="skip" href="#receita">{{nav.skip}}</a>
{{SCENE}}                                    <!-- div.scene[aria-hidden=true] com as .ph -->
<header class="topbar"><div class="wrap">
  brand · nav (7 âncoras, inclusive #assistir) · .prog (#progTxt, #progBar) · #themeBtn · {{LANG_MENU}}
</div></header>

<main id="main">
  <section class="hero" data-take="hero" aria-labelledby="h1">
    <div class="wrap"><div class="hero-copy">
      <nav class="recipes" aria-label="{{nav.recipes}}">{{RECIPE_TABS}}</nav>
      <p class="pill">{{hero.eyebrow}}</p>
      <h1 id="h1">{{H1}}</h1>                                    <!-- nome da receita em <em> -->
      <p class="lead">{{hero.lead}}</p>
      <div class="byline">…(igual hoje, sem o círculo "JS")…</div>
      <a class="next" id="nextEv" href="#cronograma" hidden></a>  <!-- manter class/id/href nesta ordem (regex do pré-render) -->
      <div class="qcard" role="group" aria-label="{{panel.pizzas}}">…#qMinus #qN #qPlus #qSum…</div>
    </div></div>
    {{HERO_CREDIT}}                                              <!-- p.credit -->
  </section>

  <section class="sheet sheet-first" id="receita" aria-labelledby="h-receita">
    <div class="wrap">
      <div class="kpis" aria-live="polite">…4 .kpi iguais a hoje…</div>
      <header class="chap"><div><p class="chap-no">{{chap.1}}</p><h2 id="h-receita">{{recipe.h2}}</h2></div><p>{{recipe.sub}}</p></header>
      <div class="grid-tool">
        <aside class="card panel" aria-label="{{panel.title}}">…painel inteiro de hoje (#panelToggle, #panelSum, #panelBody…)…</aside>
        <div class="tool-main">….tbl-wrap/table, .split, #warnBox iguais a hoje…</div>
      </div>
    </div>
  </section>

  {{WIN_TEMPO}}                                 <!-- section.win[data-take=tempo] -->

  <section class="sheet" id="cronograma" aria-labelledby="h-cron"><div class="wrap">
    <header class="chap">…{{chap.2}}…<h2 id="h-cron">{{sched.h2}}</h2>…</header>
    <div class="card">.sched-ctl + <ol class="tl" id="timeline"></ol></div>    <!-- manter class/id nesta ordem -->
    <div class="alert" id="schedWarn" hidden></div>                           <!-- manter class/id nesta ordem -->
  </div></section>

  {{WIN_GESTO}}

  <section class="sheet" id="passos" aria-labelledby="h-passos"><div class="wrap">
    <header class="chap">…{{chap.3}}…<h2 id="h-passos">{{steps.h2}}</h2><p>{{steps.sub}}</p></header>
    <div class="gesto">
      <div id="assistir" class="card np-player" role="region" aria-label="{{player.h2}}">
        <div class="screen">…stagebox ({{PLAYER_STAGE}}, #plBadge, #plWait), #plChap, .cap, .ctrl — iguais a hoje…</div>
      </div>
      <div id="stepsRoot"></div>
    </div>
  </div></section>

  {{WIN_FOGO}}

  <section class="sheet" id="forno" aria-labelledby="h-forno"><div class="wrap">
    <header class="chap">…{{chap.4}}…</header>
    <div class="oven-grid">.card.timer (igual hoje) + .card.diag (igual hoje)</div>
  </div></section>

  <div class="gap" aria-hidden="true"></div>

  <div class="sheet sheet-last">
    <section id="regras" aria-labelledby="h-regras"><div class="wrap">…{{chap.5}}… ol.rules, dl.glossary</div></section>
    <section id="sobre" aria-labelledby="h-sobre"><div class="wrap">…{{chap.6}}… .about (figura principal + .prose), .aphotos, .facts</div></section>
  </div>
</main>

<footer class="fin" data-take="fim" {{FIN_PHOTO_ATTR}}><div class="wrap">
  <p class="fin-h">{{FIN_H}}</p>
  <div class="foot">marca · {{foot.sig}} Jhonathan Sousa · .ig · nav receitas · nav idiomas · {{FIN_CREDIT}} · © …</div>
</div></footer>

<script>…app inline de hoje…</script>
<script>{{SCENE_JS}}</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
<script>{{PLAYER_JS}}</script>
</body>
```

Pontos do markup:
- **`.panel` fica fora de `<main class="content">`.** O `<main class="content">` atual some (só pode existir um `<main>`). A query do JSON-LD `#receita tbody tr` continua válida porque a tabela está dentro de `#receita`.
- **`#assistir` deixa de ter `.sec-head`.** O `h2` "Assista" vira `aria-label` da região.
- **Janela** (gerada por `win_html`):

  ```html
  <section class="win" data-take="fogo" data-photo="leopard" aria-label="{{chap.4}}">
    <div class="wrap">
      <p class="pill">IV · O fogo</p>
      <p class="win-h">Noventa segundos <em>decidem tudo.</em></p>
      <p class="win-p">…</p>
    </div>
    <p class="credit">…</p>
  </section>
  ```

  - O título da janela é `<p class="win-h">`, não `h2`, para não duplicar o sumário de títulos.
  - `data-photo` só existe quando a foto da tomada não é a foto do herói.
  - `.credit` só quando a foto difere da do herói.
- **Rodapé:** `{{FIN_PHOTO_ATTR}}` = `data-photo="nyfold"` quando a foto de `fim` não é a do herói; vazio caso contrário. `{{FIN_CREDIT}}` = "Foto de fundo: autor, licença" com links.
- **Ordem dos scripts:** o app inline primeiro (define `window.NP`), depois `scene.js`, GSAP e `player.js`.

### 5.3 Contrato `recipe.json` → `scene`

```json
"scene": {
  "scrim": 1.0,
  "takes": {
    "hero":  {"photo":"oro","d":{"f":[45,48],"a":[64,52],"s":1.00,"bleed":"l"},"m":{"f":[31,100],"a":[50,100],"s":0.66,"bleed":"t"}},
    "tempo": {"photo":"oro","d":{"f":[56,80],"a":[68,38],"s":1.30},"m":{"f":[48,82],"a":[50,40],"s":1.00}},
    "gesto": {"photo":"oro","d":{"f":[20,56],"a":[70,40],"s":1.30},"m":{"f":[18,60],"a":[50,40],"s":1.00}},
    "fogo":  {"photo":"leopard","d":{"f":[42,74],"a":[68,40],"s":1.12},"m":{"f":[40,74],"a":[50,40],"s":1.00}},
    "fim":   {"photo":"oro","d":{"f":[45,48],"a":[50,42],"s":1.00},"m":{"f":[45,50],"a":[50,42],"s":1.00}}
  }
}
```

- New York: os valores da tabela do doc 01 §7.4, com `"scrim":1.08`. O doc chama de `scene.mood`; aqui só o número interessa e `mood` é descartado.
- `f`: foco em % **do original**. `a`: âncora em % do viewport. `s`: escala sobre "cover".
- O build converte `f` para a variante: `fx = (f[0] − crop[0]) / crop[2]`, `fy = (f[1] − crop[1]) / crop[3]`. Desktop usa `crop_d`, mobile usa `crop_m`. `a` vira fração (`/100`).

**Validação** (`scene_validate(c)`). O build falha com mensagem clara se:
1. As chaves de `takes` não forem exatamente `{hero, tempo, gesto, fogo, fim}`.
2. A foto não existir em `photos.json`, ou faltar `author`/`license`/`source`/`ow`/`oh`/`crop_m`.
3. Alguma tomada `d` tiver `s > 1.30`.
4. O foco convertido sair de `[0,1]` (desktop ou mobile).
5. A foto do herói de uma receita for igual à de outra.
6. Faltar entrada no manifesto ou arquivo em `src/photos/scene/`.

O `scrim` vai **só para o `<html>`** como `style="--scrim-base:1.08"`, via placeholder `{{HTML_STYLE}}` em `<html lang="{{HTML_LANG}}" {{HTML_STYLE}}>`. O pré-render preserva atributos estáticos, e a regex de `data-theme` em `prerender()` só remove esse atributo.

### 5.4 Funções novas no `build.py`

| Função | Retorna |
|---|---|
| `credit_html(key, l, cls)` | `<p class="{cls}">Foto: <a …>autor</a>, <a … rel="noopener license">licença</a></p>`. `figure()` passa a usar a mesma lógica (refatorar o trecho que monta `credit`) |
| `scene_validate(c)` | levanta `AssertionError` (§5.3) |
| `scene_css(c)` | o `<style id="scene-css">` (§3.2) |
| `scene_markup(c)` | o `{{SCENE}}` (§4.3) |
| `scene_preload(c)` | os dois `<link rel=preload>` (§4.4), anexados ao retorno de `head()` |
| `win_html(c, l, d, take, chap_key)` | `{{WIN_TEMPO}}`, `{{WIN_GESTO}}`, `{{WIN_FOGO}}` |
| `emph(s)` | `re.sub(r'\*(.+?)\*', r'<em>\1</em>', esc(s))`. Marcador `*…*` nos textos de janela e fim, aplicado **depois** de escapar |
| `H1` | `esc(h1).replace(esc(name), f'<em>{esc(name)}</em>', 1)` com `name = d['html']['name']`. `assert` que substituiu (funciona nas 4 combinações: "Napolitana", "Neapolitan", "New York") |
| `HERO_CREDIT`, `FIN_H`, `FIN_CREDIT`, `FIN_PHOTO_ATTR`, `SCENE_JS`, `HTML_STYLE` | novas chaves em `rep` |

### 5.5 Player (`src/player.js`)

1. **`STEPS`** ganha `id:s.id` no `push`.
2. **API pública**, no fim do IIFE, antes de `go(0,false)`:

   ```js
   NP.player = { go, indexOf: id => STEPS.findIndex(s => s.id === id),
                 get mode(){ return mode }, get playing(){ return playing } };
   ```

3. **Sincronia com a etapa em foco**, só quando `matchMedia('(min-width:1100px) and (min-height:760px)')` casa (o mesmo media query do sticky):
   - `IntersectionObserver` sobre `#stepsRoot .step` com `rootMargin:'-40% 0px -59% 0px'`.
   - A etapa que entra marca `.cur` (e tira das outras).
   - Se `!playing && C.scenes[id]`: `clearTimeout(t); t = setTimeout(() => go(indexOf(id), false), 150)`.
   - No `setPP(false)` disparado por pausa ou pelo fim do filme (`onComplete` sem avanço), volte `mode='bench'` e atualize `aria-pressed`. Assim a sincronia retoma depois de assistir.
   - Ao mudar o media query, desconecte e reconecte (`mq.addEventListener('change', …)`).
4. **Modo padrão** passa a ser `'bench'`:
   - No markup, `#plBench` com `aria-pressed="true"` e `#plFilm` com `"false"`.
   - Ao clicar em play (`#plPP` quando não está tocando) ou em um capítulo de `#plChap`: `mode='film'` e atualizar `aria-pressed`.
   - **Corta-se** a volta automática por distância de scroll.
5. **"Ver o gesto"** (< 1100 px):
   - `renderSteps()` (no template) acrescenta em `.step-top`, quando `C.scenes[s.id]` existe:

     ```html
     <button type="button" class="see" data-see="${s.id}">${T.player.see}</button>
     ```

   - `player.js` faz delegação: clique em `.see` → `document.getElementById('assistir').scrollIntoView({block:'start'})` + `go(indexOf(id), true)`.
   - Se o player não iniciar (sem GSAP), `player.js` remove todos os `.see`.
   - CSS: `@media (min-width:1100px){.see{display:none}}`.
6. **Tokens.** No bloco `.np-player{…}` de `style.css`:
   - **Remova** `--ink`, `--muted`, `--line`, `--bg`, `--cold`, `--card` (passam a vir do site; `--card` vira `var(--surface)`).
   - **Mantenha** os do palco (`--stage`, `--stage2`, `--bench`, `--dough`, `--dough2`, `--crust`, `--water`, `--oil`, `--salt`, `--sauce`, `--cheese`, `--leaf`, `--steel`, `--char`, `--gold`, `--tomato: var(--accent)`) com variante escura em `:root[data-theme=dark] .np-player`.
   - O palco segue o tema.
7. **Sem dependência de `.has-3d`** (já não há nenhuma em `player.js`; conferir com `grep`).

---

## 6. Remoção segura do 3D

Inventário exato (verificado no código em `e2615d9`):

| Onde | O que sai |
|---|---|
| `build.py` `page()` | `'WORLD_JS': …` (a linha inteira); em `'CSS'`, o `+ (SRC / 'style-3d.css').read_text('utf-8')` |
| `build.py` `prerender()` | o comentário `# o 3D não roda no pré-render` |
| `build.py` `ROOT_DESC` | "with an animated 3D step-by-step protocol" → "with an animated step-by-step protocol" |
| `build.py` `head()` e `root_page()` | `<meta name="theme-color" content="#C8341F">` → `#120E0C` |
| `src/template.html` | `<div class="hero3d" id="hero3d" aria-hidden="true"></div>` |
| `src/template.html` | todo o bloco `<div class="steps3d">…</div>` **exceto** `<div id="stepsRoot"></div>`. Sai `.stage3d-wrap`, `#stage3d`, `.st3-ctrl`, `#st3Label`, `#st3Replay`, `#st3Play` |
| `src/template.html` | `<script type="importmap">…</script>` e `<script type="module">{{WORLD_JS}}</script>` |
| `src/template.html` `syncTheme` | `m.content=dk?'#1A1614':'#C8341F'` → `m.content='#120E0C'` (a topbar sobre o herói é sempre escura) |
| `src/world3d.js` | arquivo |
| `src/style-3d.css` | arquivo, depois de migrar o que segue abaixo |
| `src/style.css` | regras `:lang(zh)` (chinês removido) |
| `README.md` | linha 3: "com passo a passo animado em 3D" → "com passo a passo animado"; seção `## 3D` inteira → nova seção `## Cenário (fotos)` (§8, etapa 10) |

Conferido: `src/i18n/*.json` e `src/recipes/*/*.json` **não têm** nenhum texto com "3D". `player.sub` diz "animada", o que continua correto.

**Migrar do `style-3d.css` antes de apagar** (na etapa 2, para `style.css`; serão reescritos nas etapas 4–9):
- `.qcard` e filhos (seletor de pizzas do herói).
- `figure.ref`, `figure.aph`, `.aphotos` e variações (fotos reais).
- Tokens: nada. A etapa 4 substitui todos pelos do doc 01 §6.1. `--studio1/2` morrem; as fontes Bricolage e Atkinson saem do `<link>`.

**O que `.has-3d` escondia** (decisão deliberada):
- Player `#assistir` e o link `nav a[href="#assistir"]`: **voltam a aparecer** sempre. O player é a demonstração oficial.
- Ilustrações `.illo`: **visíveis** abaixo de 1100 px, **ocultas** a partir de 1100 px (o player sticky ao lado substitui).
- Painel recolhível no desktop: **não**. Painel aberto e sticky no capítulo I a partir de 821 px. Recolhido com resumo (`#panelSum`) e "Ajustar" até 820 px (hoje o corte é 960; muda para 820).
- `.step.on` (destaque do 3D) vira `.step.cur`, controlado pelo `player.js`.

---

## 7. Sistema visual (resumo para o CSS)

O `src/style.css` é reescrito em blocos nesta ordem: tokens → base → topbar → herói → folha/capítulo/cartão → receita → cronograma → gesto/player/etapas → forno → regras/sobre → janelas/fim → cenário → utilidades/reduced motion.

### 7.1 Tokens e temas

- Use exatamente os tokens do doc 01 §6.1, mais:
  - `--scene-rgb:18 14 12`;
  - `--focus` (padrão `var(--accent)`; nas áreas de cena `var(--oro)`);
  - as escalas `--t-*`, `--r-*`, `--sh-*`, `--ease-*` de §6.2–6.3;
  - `--gut:clamp(16px,4vw,56px)`.
- Mantenha os tokens de ilustração que `illustrations.js` usa (`--dough`, `--dough-2`, `--mozz`, `--illo`, `--steel`, `--it-g/w/r`), recalibrados para os novos fundos.
- Três blocos:
  - `:root, :root[data-theme="light"]{…}`;
  - `:root[data-theme="dark"]{…}`;
  - `@media (prefers-color-scheme:dark){ :root:not([data-theme]){…cópia do escuro…} }`. Necessário porque o pré-render remove `data-theme` e o visitante sem JS fica sem o atributo.
- Véu: `--scrim-k: var(--scrim-base, 1)` no claro e `calc(var(--scrim-base, 1) * 1.12)` no escuro. `--bd-dim:0` no claro, `.26` no escuro.

Contrastes verificados aqui (WCAG 2.x), completando os "—" do doc 01:

| Par | Claro | Escuro |
|---|---|---|
| `muted`/`bg` | 6,30 | 8,34 |
| `muted`/`surface-2` | 5,70 | 6,80 |
| `accent`/`bg` | 4,83 | 6,33 |
| `accent-ink`/`bg` | 6,64 | — |
| `accent`/`accent-soft` | — | 5,03 |
| `basil`/`basil-soft` | 4,97 | 6,68 |
| `ember`/`ember-soft` | 5,38 | 7,11 |
| `cold`/`bg` | 5,47 | 8,90 |
| `line-strong`/`bg` | 3,21 | 3,79 |
| `scene-muted`/`scene` | 12,05 | |
| `oro`/`scene` | 10,57 | |
| `#74C08D` (faixa "ponto" do timer)/`scene` | 8,84 | |

Todos passam. **Regra:** texto pequeno em `--accent` só sobre `bg`/`surface` (≥ 4,8). Em `accent-soft` no claro, use `--accent-ink`.

### 7.2 Fontes

Substitua o `<link>` atual por:

```
https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..600&family=Atkinson+Hyperlegible+Next:wght@400..700&family=JetBrains+Mono:wght@400;600&display=swap
```

- Pilhas de reserva conforme doc 01 §6.2.
- Verifique que a URL responde 200 (`curl -sI "<url>" | head -1`) antes de seguir.
- Se "Atkinson Hyperlegible Next" não existir, use `Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400`.
- Sem `:lang(zh)`.

### 7.3 Seletores-chave e valores

| Seletor | Regra essencial |
|---|---|
| `html` | `scroll-padding-top:72px` |
| `body` | `background:var(--scene); color:var(--ink); font:400 17px/1.55 var(--f-body)` (16,5 px ≤ 820) |
| `.wrap` | `max-width:1240px; margin-inline:auto; padding-inline:var(--gut)` |
| `.skip` | fora da tela até `:focus` (aí vira pílula fixa no topo esquerdo, `z-index:30`) |
| `:focus-visible` | `outline:3px solid var(--focus); outline-offset:3px`. `--focus:var(--oro)` em `.hero, .win, .fin, .timer, .topbar.on-hero` |
| `.topbar` | `position:fixed; inset:0 0 auto; height:60px` (56 ≤ 820). Nav oculta ≤ 900. Barra `.prog` 56 × 4 px (ouro em `.on-hero`, `--basil` sólida). Respeite `env(safe-area-inset-top)` com `padding-top` |
| `.hero` | `min-height:100svh; display:grid; align-items:end; padding:96px 0 136px; color:var(--scene-ink); position:relative; isolation:isolate`. `::before` com o véu do doc 01 §6.6 (`z-index:-1`). Mobile: `display:flex; padding:84px 0 56px`; texto no topo e `.qcard` com `margin-top:auto`. O véu mobile termina o texto antes de 50% da altura; em telas baixas o herói cresce em vez de sobrepor |
| `.hero-copy` | `max-width:min(600px,52vw)`. O `--c` do véu do herói usa a mesma expressão (`calc(var(--gut) + min(600px,52vw))`), senão em 1024 px metade da pizza fica sob o texto |
| `.hero h1` | `font:560 var(--t-hero)/.94 var(--f-display); letter-spacing:-.025em; text-wrap:balance`. `em{font-style:italic;font-weight:400;color:var(--oro)}` |
| `.pill` | mono 12 px, caixa alta, `color:var(--oro); background:var(--scene); border:1px solid rgb(233 184 114/.4)` |
| `.next` (no herói) | pílula sólida carvão, texto creme. Mantenha o `::before` (ponto) em `--basil` escuro (`#74C08D`) |
| `.recipes` | segmentado: fundo `rgb(var(--scene-rgb)/.82)`, ativo `scene-ink` com texto `scene` |
| `.qcard` | fundo `var(--scene)`; botões 48 px redondos; `output` Fraunces 38 px. Mobile: largura total |
| `.credit` | 12 px, `background:rgb(var(--scene-rgb)/.78)`, pílula; herói: `right:var(--gut); bottom:148px` (mobile `left:var(--gut); bottom:20px`) |
| `.sheet` | `position:relative; background:var(--bg); color:var(--ink); border-radius:var(--r-sheet); box-shadow:var(--sh-sheet); padding-bottom:88px` (56 ≤ 820). `.sheet-first` com raio só em cima |
| `.kpis` | um cartão dividido por fios; ≥ 821: `translate:0 -64px; margin-bottom:-40px`; ≤ 820: 2 × 2, sem deslocamento |
| `.chap` | grade 5/7, `padding:56px 0 28px; border-bottom:1px solid var(--line); margin-bottom:36px`; `.chap-no` mono 12,5 px `--accent-ink` |
| `.grid-tool` | `grid-template-columns:320px minmax(0,1fr); gap:28px; align-items:start`; `.panel{position:sticky; top:84px; max-height:calc(100svh - 108px); overflow:auto}`. ≤ 820: uma coluna, painel estático e recolhível |
| `.inp` | 44 px (48 ≤ 820), 118 px, `border:1.5px solid var(--line-strong)`; foco com borda `accent` e halo de 3 px |
| `table` | `th` eyebrow; `td` 15 × 20 px; ≤ 820 cabeçalhos `.short`; ≤ 560 esconder a coluna `%` (regra atual). Requisito: sem rolagem horizontal em 360 px |
| `.win` | `min-height:68svh` (72 ≤ 820); `display:grid; align-items:end; padding:120px 0 64px; color:var(--scene-ink); position:relative; isolation:isolate`; `::before` com o véu do doc 01 §6.6. `.win-h` Fraunces `--t-scene` |
| `.gesto` | ≥ 1100: `grid-template-columns:minmax(0,5fr) minmax(0,6fr); gap:32px; align-items:start`. Abaixo disso, uma coluna, player no topo |
| `#assistir` | `@media (min-width:1100px) and (min-height:760px){position:sticky; top:84px}` |
| `.step` | cartão, sem `.illo` ≥ 1100; 2 colunas (200 px + corpo) entre 681 e 1099; empilhado ≤ 680. `.check` 44 px, largura total ≤ 820 |
| `.timer` | remapeamento local: `--ink:var(--scene-ink); --muted:var(--scene-muted); --surface-2:rgb(255 247 234/.14); --line-strong:rgb(255 247 234/.4); --accent:#F26A47; --on-accent:#1A0B06; --basil:#74C08D; --ember:var(--oro); background:var(--scene); color:var(--ink)`. `.clock` mono `clamp(72px,11vw,148px)`; `.track` 18 px (as zonas usam `--ember`/`--basil`); botões 52 px |
| `.chip` | 44 px; ativo `ink` com texto `bg` |
| `.rules li::before` | numeral Fraunces itálico 34 px `--accent-ink` |
| `.about` | grade 7/5; primeira foto de `photos.about` = `figure.aph` grande, `.prose` com capitular |
| `.aphotos` (mobile) | `display:grid; grid-auto-flow:column; grid-auto-columns:80%; overflow-x:auto; scroll-snap-type:x mandatory` |
| `.gap` | `height:20px` |
| `.fin` | `min-height:72svh` (60 ≤ 820), véu vertical `.96 → .72 → .30`, `.fin-h` Fraunces itálico `clamp(36px,6vw,88px)`; `.foot` em linha com fio superior creme a 22% |

Remova do CSS: `.mono-js` (o círculo "JS" sai da assinatura e do rodapé), `.sec-head` (substituído por `.chap`), a faixa tricolor `.topbar::after` (a bandeira continua na marca).

---

## 8. Plano de implementação incremental

Regras para cada etapa:
- Comece de `git status` limpo.
- Ao final, rode `python3 build.py` (deve terminar com `ok`).
- Faça a checagem descrita.
- Faça **um commit por etapa**, com a mensagem indicada, terminando com a linha de coautoria que o ambiente exigir.

Comandos úteis:
- **Servir:** `preview_start` com o nome `napoliprotocol` (ou `python3 -m http.server 8766 --directory docs`).
- **Captura sem servidor:** `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars --virtual-time-budget=3000 --window-size=W,H --force-device-scale-factor=2 --screenshot=/tmp/np-W.png http://localhost:8766/pt/`
- **Grep no build:** `grep -rlE "three|importmap|has-3d|world3d|stage3d|hero3d" docs/ ; echo "exit=$?"`. Esperado: nenhuma linha e `exit=1`.

### Etapa 0 · Linha de base
- **Fazer:** confirmar a branch `redesign-imersivo`; `python3 build.py`; capturar `pt/` e `pt/new-york/` em 375 e 1440 (arquivos em `/tmp/base-*`).
- **Verificar:** o build termina com `ok`. Commitar a modificação pendente do `.gitignore` (`src/photos/originals/`).

### Etapa 1 · Endurecer o pré-render
- **Arquivos:** `build.py`.
- **Fazer:** em `prerender()`, trocar cada `re.sub` de conteúdo (`timeline`, `scn`, `nextEv`, `schedWarn`) por `re.subn` com `assert n == 1, '<nome>'`. **Antes**, afrouxar os padrões para aceitar atributos extras, porque o JS do pré-render acrescenta `hidden=""`. Hoje (`grep -o 'id="schedWarn"[^>]*>' docs/pt/index.html` → `id="schedWarn" hidden="">`) as regexes de `schedWarn` e `nextEv` **não casam e não fazem nada**. Padrões novos:
  - `r'<a class="next" id="nextEv" href="#cronograma"[^>]*>.*?</a>'`
  - `r'<div class="alert" id="schedWarn"[^>]*>.*?</div>'`
  - `r'<ol class="tl" id="timeline"[^>]*>.*?</ol>'`
  - `r'<g id="scn">.*?</svg>'`

  Os quatro elementos sempre existem, então `n == 1` é invariante. O de `data-theme` continua com `count=1`, sem assert. Acrescentar `assert 'class="step done"' not in dom`.
- **Verificar:** o build passa; `docs/pt/index.html` contém `<ol class="tl" id="timeline"></ol>`.
- **Commit:** `Build: pré-render falha se um trecho dinâmico não for encontrado`.

### Etapa 2 · Remover o 3D
- **Arquivos:** `build.py`, `src/template.html`, `src/style.css`, `src/style-3d.css` (apagar), `src/world3d.js` (apagar), `README.md`.
- **Fazer:** tudo da tabela do §6; migrar `.qcard`, `figure.ref/.aph`, `.aphotos` para `style.css`; remover `:lang(zh)`.
- **Verificar:**
  - O grep do build não acha nada.
  - No navegador, `/pt/` mostra o layout 2D atual com o player visível e a nav com "Assista".
  - O console não mostra erros (a não ser o 404 das fontes, se offline).
  - Ao mudar o nº de pizzas, o player redesenha.
- **Commit:** `Remove o mundo 3D (three.js, importmap, world3d, style-3d)`.

### Etapa 3 · Pipeline `--scene` e derivadas
- **Arquivos:** `build.py`, `src/photos/photos.json`, `src/photos/scene/**` (novo).
- **Fazer:** §4.1 e §4.2; cópia de `src/photos/scene` → `docs/img/scene` em `main()`; função `load_manifest()`.
- **Verificar:**
  - `python3 build.py --scene` imprime a tabela de pesos sem avisos (ou com avisos resolvidos ajustando `q`).
  - `ls src/photos/scene | wc -l` dá cerca de 56–64 arquivos.
  - `sips -g pixelWidth -g pixelHeight src/photos/scene/nyslice-m-1600.avif` não se aplica (`sips` não lê AVIF). Use `cat src/photos/scene/manifest.json` e abra `nyslice-m-1600.webp` no Chrome para conferir visualmente o recorte (faixa de cima, com a lata, removida).
  - `git status` não lista `originals/`.
  - Mover temporariamente `src/photos/originals` para outro nome e rodar `--scene`: o script deve imprimir `skip` e o build normal deve continuar passando. Depois desfazer a troca de nome.
- **Commit:** `Imagens de cenário: derivadas AVIF/WebP/JPG geradas por build.py --scene`.

### Etapa 4 · Tokens, fontes e base
- **Arquivos:** `src/style.css`, `src/template.html` (`<link>` de fontes), `build.py` (`theme-color`).
- **Fazer:**
  - Reescrever o bloco de tokens (§7.1), a tipografia (§7.2) e os componentes base: botão, input, seg, cartão, chip, tag, alerta, dica, check, foco.
  - Ainda sem mexer no layout das seções.
  - Bloco `.np-player` com os tokens reduzidos (§5.5, item 6).
- **Verificar:**
  - A página antiga aparece com a nova paleta e as novas fontes nos dois temas. Alternar o tema com `#themeBtn`.
  - Rodar o snippet de contraste (§9.1) em 3 elementos de cada tema.
  - O player continua legível no claro e no escuro.
- **Commit:** `Tokens e tipografia Luce di Forno`.

### Etapa 5 · Contrato do cenário e herói
- **Arquivos:** `src/recipes/*/recipe.json` (`scene`), `src/i18n/{pt,en}.json` (`nav.skip`, `foot.bgphoto`), `build.py` (`scene_validate`, `scene_css`, `scene_markup`, `scene_preload`, `credit_html`, `H1`, `HERO_CREDIT`, `HTML_STYLE`), `src/template.html` (skip link, `{{SCENE}}`, novo `.hero`, topbar fixa), `src/style.css` (cenário §3.2, topbar, herói), `src/scene.js` (§3.3 completo; as janelas ainda não existem, então só a topbar e o herói têm efeito).
- **Fazer:** a sequência acima. KPIs ainda dentro do fluxo antigo, logo abaixo do herói.
- **Verificar:**
  - 1440 × 900: a pizza à direita, com centro entre 60% e 68% da largura (captura). A borda esquerda dissolve sem linha dura.
  - 1024 × 768: o centro da pizza fica fora da coluna de texto (o texto termina antes de ~52% da largura).
  - 390 × 844: meia-lua na base; o texto termina antes de 50% da altura.
  - `/pt/new-york/` mostra `nyslice`, sem lata visível fora do véu.
  - DevTools > Network: só um arquivo de cenário baixado (AVIF), com prioridade High. Nenhum download duplicado do mesmo recurso.
  - Desligar o JS (DevTools > Run command > Disable JavaScript): o herói continua enquadrado e a topbar fica sólida.
  - `grep -c 'data-take=' docs/pt/index.html` ≥ 1 e `grep -c 'class="scene" data-take' docs/pt/index.html` = 0 (o pré-render não gravou `data-take` no `.scene`).
  - Testar a validação: mudar `"s":1.30` para `1.4` em `tempo.d` → o build falha com mensagem clara; desfazer.
- **Commit:** `Herói fotográfico com cenário fixo em CSS`.

### Etapa 6 · Folhas, capítulos, janelas e cena final
- **Arquivos:** `src/template.html` (estrutura §5.2 inteira, exceto o miolo do player), `build.py` (`win_html`, `emph`, `FIN_*`), `src/recipes/*/{pt,en}.json` (bloco `scene`, textos abaixo), `src/i18n/{pt,en}.json` (`chap.1`…`chap.6`), `src/style.css` (folha, capítulo, KPIs, grid-tool/painel, tabela, cronograma, janelas, `.fin`, regras/sobre).
- **Textos** (`src/recipes/<id>/<lang>.json` → `"scene":{"tempo":{"h","p"},"gesto":{"h","p"},"fogo":{"h","p"},"fim":{"h"}}`; `*…*` = itálico ouro):

  | | napolitana pt | napolitana en | new-york pt | new-york en |
  |---|---|---|---|---|
  | tempo.h | `Três dias, *uma noite.*` | `Three days, *one night.*` | `Quarenta e oito horas *de frio.*` | `Forty-eight hours *in the cold.*` |
  | tempo.p | O sabor vem do frio e da espera. O cronograma conta para trás a partir da hora de assar. | Flavour comes from cold and waiting. The schedule counts back from bake time. | A massa amadurece devagar na geladeira. O cronograma conta para trás a partir da hora de assar. | The dough matures slowly in the fridge. The schedule counts back from bake time. |
  | gesto.h | `Assista antes, *faça depois.*` | `Watch first, *then do.*` | `Assista antes, *faça depois.*` | `Watch first, *then do.*` |
  | gesto.p | Cada etapa animada com as suas quantidades. | Every step animated with your quantities. | (igual) | (igual) |
  | fogo.h | `Noventa segundos *decidem tudo.*` | `Ninety seconds *decide everything.*` | `Sete minutos *de forno.*` | `Seven minutes *in the oven.*` |
  | fogo.p | A primeira pizza calibra o forno. Cronometre, leia a borda, ajuste a pedra. | The first pizza calibrates the oven. Time it, read the rim, adjust the stone. | Forno mais brando, assamento mais longo. Cronometre e leia o fundo. | A gentler oven and a longer bake. Time it and read the bottom. |
  | fim.h | `Farinha, água, sal, *tempo.*` | `Flour, water, salt, *time.*` | `Dobre ao meio. *Coma em pé.*` | `Fold it in half. *Eat it standing.*` |

  `chap.1`…`chap.6`:
  - pt: "I · A massa", "II · O tempo", "III · O gesto", "IV · O fogo", "V · O ofício", "VI · A origem".
  - en: "I · The dough", "II · Time", "III · The craft", "IV · Fire", "V · The rules", "VI · Origins".

  As pílulas das janelas usam as mesmas chaves `chap.n`.
- **Verificar:**
  - Rolar `/pt/` de cima a baixo em 1440 e 390: as folhas sobem por cima da foto parada; as janelas mostram o cenário (ainda na tomada `hero`, porque a câmera vem na etapa 7).
  - O painel fica sticky só dentro do capítulo I (≥ 821).
  - A tabela da napolitana não rola na horizontal em 360 px.
  - O build passa no `leak_check` da NY.
  - Clicar em todos os links da nav: cada âncora cai no cabeçalho do capítulo, não atrás da topbar.
- **Commit:** `Layout editorial: folhas, capítulos, janelas e cena final`.

### Etapa 7 · Câmera e transições
- **Arquivos:** `build.py` (`scene_css` completo, com regra da foto inativa, bleed e mobile), `src/scene.js` (já completo), `src/style.css`.
- **Verificar:**
  - Rolando devagar em 1440: hero → tempo (desliza 1,4 s) → gesto (desliza) → fogo (fusão para `leopard`, sem a `oro` se mexer enquanto some) → fim (fusão de volta).
  - Network: `leopard` só baixa quando a janela III se aproxima.
  - Abrir do zero `/pt/#sobre` e `/pt/new-york/#sobre`; rolar até a fresta de 20 px e até o rodapé. A foto secundária (`leopard`/`nyfold`) deve estar visível, não carvão liso.
  - Saltar pela nav de `#receita` para `#forno` e rolar até a fresta de 20 px abaixo do forno: o cenário mostra `fogo`, não `hero`.
  - DevTools > Rendering > `prefers-reduced-motion: reduce`: nenhuma transição visível; a tomada já está trocada quando a janela entra.
  - Girar o viewport (390×844 ↔ 844×390): sem faixa vazia, exceto nas bordas com bleed.
  - Ajustar as tomadas da NY (±3 pontos) até: sujeito fora do bloco de texto e lata fora da área sem véu.
  - Performance panel, 10 s de rolagem: sem tarefas longas atribuídas a script de scroll.
- **Commit:** `Câmera do cenário: tomadas por janela com CSS e IntersectionObserver`.

### Etapa 8 · Player e passo a passo
- **Arquivos:** `src/player.js` (§5.5), `src/template.html` (`renderSteps` com `.see`; `#plBench` com `aria-pressed="true"`), `src/i18n/{pt,en}.json` (`js.player.see`: "Ver o gesto" / "Watch this step"), `src/style.css` (`.gesto`, `#assistir` sticky, `.step`, `.cur`, `.see`, `.illo` ≥ 1100).
- **Verificar:**
  - 1440 × 900: o player fica sticky ao lado das etapas; ao rolar, a etapa sob a linha de 40% ganha o fio vermelho e o player troca de cena (sem tocar).
  - Play → toca em sequência (Filme) e o scroll não interrompe.
  - 1024 e 768: player no fluxo, no topo do capítulo; os botões "Ver o gesto" rolam até o player e tocam a cena certa.
  - Mudar o nº de pizzas: o player redesenha.
  - Marcar etapas: o progresso na topbar avança e a etapa concluída recolhe.
  - `/en/new-york/` funciona igual.
  - O console não mostra erros.
- **Commit:** `Player sincronizado com a etapa em foco; player no lugar do palco 3D`.

### Etapa 9 · Forno, regras, sobre e mobile
- **Arquivos:** `src/style.css` (timer escuro, diagnóstico, regras, glossário, sobre, carrossel `.aphotos`), `src/template.html` (estrutura de `#sobre`: figura principal + `.prose` com `ABOUT_SITE`/`ABOUT_PIZZA`; `.facts` em faixa).
- **Verificar:**
  - O timer roda, pausa e zera; as faixas de cor estão certas; a wake lock é pedida.
  - Diagnóstico: o botão "Aplicar" altera o parâmetro e o cronograma.
  - Capturas em 375, 768, 1024 e 1440 nos 4 endereços, sem sobreposição nem rolagem horizontal. Conferir com `document.documentElement.scrollWidth <= innerWidth` no console.
- **Commit:** `Forno, regras e sobre na nova identidade; ajustes mobile`.

### Etapa 10 · Raiz, 404, páginas aposentadas, README
- **Arquivos:** `build.py` (`root_page`, `not_found`, `retired_page`), `README.md`.
- **Fazer:**
  - Página raiz:
    - CSS inline, `background:#120E0C; color:#FFF7EA`;
    - título em `Georgia, serif` itálico, com "Protocol" em `#E9B872`;
    - a faixa tricolor vira a bandeira 18×12 da marca;
    - cartões com borda `rgb(255 247 234/.2)` e hover `#E9B872`;
    - foco `outline:3px solid #E9B872`.
  - 404:
    - mesmo estilo;
    - texto bilíngue "Página não encontrada · Page not found";
    - links para `/pt/` e `/en/` (não só `/`).
  - `retired_page`: mesmas cores.
  - Sem web fonts nessas páginas.
  - README: §6 e a nova seção "Cenário (fotos)". Ela explica:
    - os originais em `src/photos/originals/` (fora do git);
    - `python3 build.py --scene`;
    - onde ficam as derivadas;
    - como declarar `scene` no `recipe.json`.
- **Verificar:**
  - Abrir `http://localhost:8766/`: redireciona.
  - Abrir `http://localhost:8766/nao-existe`: o `http.server` não serve o 404 customizado, então abra `/404.html` direto.
  - Contraste dos links ≥ 4,5 (`#E9B872` sobre `#120E0C` = 10,6).
- **Commit:** `Raiz, 404 e redirecionamentos na identidade nova; README`.

### Etapa 11 · QA final (sem commit, salvo correções)
Executar a lista do §9 nos 4 endereços (`/pt/`, `/en/`, `/pt/new-york/`, `/en/new-york/`) e corrigir o que falhar.

### Etapa 12 · Polimento opcional (deletável; um commit)
- Texto das janelas com `animation-timeline:view()` (§3.4).
- Opcional: fade do texto do herói esfregado (`.hero-copy{animation:fade-out linear both; animation-timeline:view(); animation-range:exit 0% exit 80%}`, só opacidade e `translate` de −24 px, dentro de `@supports` e `prefers-reduced-motion:no-preference`). **Não** aplicar escala ao cenário.
- Opcional: imagens OG em `build.py` `card_html()` com a nova identidade. Fundo `#120E0C`, Fraunces, creme e foto `src/photos/scene/<hero>-d-1920.jpg` à direita via `file://`. Rodar `python3 build.py --images`.
- **Verificar:** o mesmo da etapa 11. Se algo piorar o INP/CLS, reverter o commit.

---

## 9. Critérios de qualidade e como verificar

### 9.1 Acessibilidade
- **Landmarks:** um `header` (topbar), um `main#main`, um `footer`; navs com `aria-label`; skip link funcional (Tab a partir do topo → "Pular para a receita" → Enter leva a `#receita`).
- **Títulos:** um `h1`; `h2` só nos capítulos (Receita, Cronograma, Passo a passo, Forno, Regras, Sobre); `h3`/`h4` como hoje.
- **Teclado:** percorrer a página inteira com Tab. Todos os controles alcançáveis, nesta ordem visual: abas, pizzas ±, painel, segmentado, inputs, data, player, check, "Ver o gesto", timer, chips, aplicar, idioma, tema. Foco visível de 3 px em ouro sobre a cena e em `accent` nas folhas. O menu `<details>` de idioma abre com Enter e fecha com Esc (comportamento nativo do `details`; aceitar).
- **Contraste:** pares do §7.1. Sobre a foto, véu ≥ 62% sob todo texto creme. Verificar com captura nos dois temas e conta-gotas do DevTools no pior ponto sob o lead e o título de cada janela (≥ 4,5:1 texto normal, ≥ 3:1 para ≥ 32 px). Snippet para o console:

  ```js
  (()=>{const L=c=>{const [r,g,b]=c.match(/\d+(\.\d+)?/g).slice(0,3).map(v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4});return .2126*r+.7152*g+.0722*b};
   const f=getComputedStyle($0).color, b=prompt('fundo rgb()', getComputedStyle($0).backgroundColor); const [x,y]=[L(f),L(b)].sort((a,b)=>b-a); return ((x+.05)/(y+.05)).toFixed(2)})()
  ```

- **Cenário:** `.scene` com `aria-hidden="true"` e `alt=""`.
- **Movimento:** reduced motion conforme §3.5.
- **Alvos:** ≥ 44 px; timer, pizzas ± e player ≥ 48 px.

### 9.2 Responsividade
Larguras 375, 768, 1024 e 1440 (alturas 812, 1024, 768, 900), mais 360×640 para o herói.

| Largura | Herói | Painel | Player |
|---|---|---|---|
| 375 / 768 | mobile | recolhido | no fluxo |
| 1024 | desktop | sticky | no fluxo |
| 1440 | desktop | sticky | sticky |

Em todas: `document.documentElement.scrollWidth <= innerWidth`.

### 9.3 Desempenho
Medir no navegador (porta 8766) com throttling "Fast 4G" e CPU 4× no DevTools. Colar antes de recarregar e ler depois de rolar até o fim:

```js
new PerformanceObserver(l=>l.getEntries().forEach(e=>console.log('LCP',Math.round(e.startTime),e.element))).observe({type:'largest-contentful-paint',buffered:true});
let cls=0;new PerformanceObserver(l=>l.getEntries().forEach(e=>{if(!e.hadRecentInput)cls+=e.value;console.log('CLS',cls.toFixed(3))})).observe({type:'layout-shift',buffered:true});
new PerformanceObserver(l=>l.getEntries().forEach(e=>e.duration>200&&console.log('INP-ish',e.name,Math.round(e.duration)))).observe({type:'event',buffered:true,durationThreshold:40});
```

Metas:
- LCP < 2,5 s, sendo o elemento a foto do herói ou o `h1`.
- CLS < 0,1 (alvo ≤ 0,05).
- Nenhum evento > 200 ms ao digitar nos inputs, clicar em check ou em ±.
- Bytes de imagem dentro do §4.6.
- Se houver Lighthouse disponível (`npx lighthouse` exige rede/npm), use como confirmação, não como requisito.

### 9.4 Console e build
- Zero erros e zero avisos próprios no console nos 4 endereços, com JS ligado (ignorar extensões).
- `python3 build.py` termina em `ok`.
- O grep do 3D (§8) não acha nada.
- `docs/` contém `sitemap.xml`, `robots.txt`, `CNAME`, `.nojekyll`, `404.html`, `index.html`, `es/ it/ zh/` e `img/scene/`.
- Cada página contém `id="ld-recipe"` e `class="step"`.
- O HTML gravado não contém `data-take=` dentro do `<div class="scene"`, nem `on-hero`, nem `class="step done"`, nem `data-theme=` no `<html>`.

### 9.5 Funcional (regressão)
Lista de "precisa ser preservado" do doc 00. Testar em `/pt/` e `/en/new-york/`:
- modo farinha/pizzas;
- reset;
- persistência após recarregar;
- divisão de água (só napolitana);
- alertas;
- cronograma com "próximo evento";
- player;
- etapas concluídas com progresso;
- timer;
- diagnóstico com "aplicar";
- abas de receita;
- idioma;
- tema (manual e automático);
- JSON-LD (`document.getElementById('ld-recipe').textContent` válido).

---

## 10. Riscos conhecidos e mitigação

| Risco | Mitigação |
|---|---|
| `translate` com `clamp()` e variáveis não transiciona em algum Safari | Testar no Safari (macOS) na etapa 7. Se falhar: mover a fórmula para `transform: translate(…) scale(…)` na mesma regra (as variáveis são as mesmas) |
| `100lvh` sem suporte | Variável `--vh` com fallback para `100vh` (§3.2) |
| Fonte "Atkinson Hyperlegible Next" indisponível no Google Fonts | Fallback da §7.2 |
| Pré-render baixa as imagens via `file://` e falha (`/img/...`) | Esperado e inofensivo: a câmera não depende de imagem carregada e o `scene.js` não roda |
| Tomadas da NY mal enquadradas | Ajuste fino na etapa 7. Critério do doc 01 §7.4 |
| Repositório cresce cerca de 15 MB (`src` + `docs`) | Aceito. Larguras e formatos já reduzidos (§4.2) |
| Player sticky mais alto que a tela | Sticky só com `min-height:760px` |
