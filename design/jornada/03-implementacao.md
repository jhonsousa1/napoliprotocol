# Jornada · 03 · Implementação

Branch `redesign-imersivo`. Etapas E0 a E9 do `02-arquitetura.md` executadas; a E10 (auditoria independente) fica para outra sessão. Nada foi commitado; só houve `git rm` (E8).

## Etapas concluídas
- **E0** Linha de base e ferramenta: `design/jornada/baseline/ld-<receita>-<idioma>.json` (4 arquivos), `tools/ld.py` (compara o objeto JSON-LD inteiro com a linha de base) e `tools/cdp.mjs` (sobe servidor estático na 8770 e Chrome na 9333 e encerra os dois no `finally`; `scrollTo` com `behavior:'instant'`).
- **E1** Esqueleto, build e abertura: `build.py` (kspan, scene_svg/scene_layers, figure_html, tags_html, build_journey, validate_journey, prerender novo), `template.html` e `style.css` reescritos, `app.js` (calc() idêntico byte a byte ao original, conferido por diff) e `journey.js`.
- **E2/E3/E5** Cenas: as 9 composições e 22 estados (`bench jar fridge bowl slab tray sauce oven slice`) mais `pending.svg`, num só passo (as composições da New York usam as mesmas). Nenhum ladrilho ficou como `pending`.
- **E4** Ferramentas: diálogo Ajustes (todos os ids antigos), agenda com horário em cada cartão, selo "agora", "faltam…", Feito, trilho, doca, índice, timer com anel e mini-timer, diagnóstico, epílogo com galeria de fotos reais, retomar, troca de receita levando o nº de pizzas, interruptor de movimento (`np-ui`).
- **E6** Inglês: todos os textos novos já nasceram em pt e en; `grep -rn "\[EN\]" src` vazio.
- **E7** Modo estático (reduzido, sem JS, pré-render): `.scene` relativa, câmera "contida", `content-visibility` no epílogo e nas figuras estáticas.
- **E8** Legado removido: `git rm -r docs/img/scene src/photos/scene src/scene.js src/player.js src/player-stage.svg src/illustrations.js`; funções e constantes de cenário/manifest/`--scene` fora do `build.py`; chaves de texto sem uso apagadas (`STRICT_UNUSED = True`: agora é erro de build); `scene`/`scenes` fora do `recipe.json`; `photos.steps` virou `photos.gallery`; campos `ow/oh/crop_*/q` fora de `photos.json`; campo `il` dos passos fora; README e `.gitignore` atualizados. `docs/` caiu de ~11 MB para 6,8 MB.
- **E9** QA completa (abaixo).

## Arquivos
- Criados: `src/app.js`, `src/journey.js`, `src/scenes/{defs,pending,bench,jar,fridge,bowl,slab,tray,sauce,oven,slice}.svg`, `design/jornada/tools/{cdp.mjs,cdp-more.mjs,ld.py,art.py}`, `design/jornada/baseline/*.json`, este documento.
- Reescritos: `src/template.html`, `src/style.css`. Alterados: `build.py`, `src/i18n/*.json`, `src/recipes/*/{recipe,pt,en}.json`, `src/photos/photos.json`, `README.md`, `.gitignore`, as 4 páginas geradas em `docs/`.
- Removidos (`git rm`): ver E8.

## Desvios do plano e motivo
1. **Passagem 1 px menor que a largura** (`translate(calc(100% - 1px))`): com 100% exato havia um filete de antialiasing na emenda das duas figuras. Com 1 px de sobreposição a emenda some; o critério 7 mede 1 px de diferença entre bordas (dentro de ≤ 1 px), igual em `sda` e `jsd`.
2. **Tokens `estado+flag` e `estado+<receita>`** nos `<!--if-->` (ex.: `mise+pf`, `open+napolitana`), porque os blocos não podem ser aninhados e o plano precisava de "estado E receita".
3. **Linha da bancada em 600, mas os objetos assentam em y ≈ 622** (a base de um objeto fica à frente da quina da parede), todos dentro da caixa segura (≤ 630).
4. **`s5` da New York com `ev: 1`** (o plano dizia 0): o texto do cronograma coloca "Etapa 05" no evento "Bolear e refrigerar".
5. `ask.sub` da napolitana é "3 dias · 64% de hidratação" (não "pré-fermento"), para não vazar termo de `LEAKS` na página da New York.
6. Epílogo, abertura e prólogo usam o HTML no `template.html` (com placeholders) e não funções Python; o Python gera figuras, etapas, trilho, doca e índice. Chaves `step.now` e `cold.left` ficaram só em `js` (o JS é quem as usa).
7. `kspan`, tokens de cena e a tabela `--sizes` conforme o plano; a validação de "chave sem uso" soma o uso entre as 4 páginas (blocos `{{#sugar}}` etc. contam como usados).
8. Os mini-controles do abertura no mobile são mais compactos (cartões de receita só com o nome, sem "lead", sem "Próximo evento") para o "Começar" caber na janela de leitura de 379 px.
9. O orçamento de SVG ficou muito abaixo do limite: maior ladrilho 2,3 KB e 36 elementos; SVG por página ~32 KB (limite 240 KB). As cenas poderiam ter mais detalhe se o dono quiser.

## Verificações (todas com Chrome headless via CDP; servidor local sem gzip)
- `python3 build.py` termina em `ok` (4 páginas; sem aviso de orçamento nem de chave sem uso).
- `tools/ld.py cmp`: 4 de 4 JSON-LD idênticos à linha de base (objeto inteiro).
- `grep -o 'class="tile step'`: 13 (napolitana) e 12 (New York). Números do pré-render presentes (`pfFlour` 400, `bassWater` 18, `n` 5); `<html>` sem classes, nenhum `.live`, nenhum `transform` em `.scene`, `data-when` vazio.
- `git diff` de `docs/sitemap.xml`, `robots.txt`, `404.html`, `CNAME`, `es/it/zh`: vazio.
- `cdp.mjs checks` (rolagem horizontal, console limpo, vãos entre ladrilhos = 0) em 360×640, 375×812, 768×1024, 1024×768, 1280×720, 1440×900, 1920×1080 e 812×375, claro e escuro, com e sem movimento: 64 casos, 0 falhas.
- `seam` (critério 7): emenda e igualdade `sda`×`jsd` em 1440×900, 375×812 e 1024×768, nas 16 passagens, nas 4 páginas: 0 falhas.
- `tags` (critérios 8 e 17): 85 etiquetas na napolitana; nenhuma visível no meio das passagens; todas inteiras no palco e fora do cartão (inclusive 1024×768); 0 falhas em pt, en e New York pt/en.
- `mobile` (critério 9) em 375×812 e 768×1024 (s2, s12; NY s1, s9): palco 100 % visível, nada cobre o palco, sem rolagem interna, "Feito" alcançável; "Começar" inteiro na abertura. 0 falhas.
- `contrast` (critério 10): etiquetas ≥ 7:1 e todo texto de interface medido ≥ 4,8:1, claro e escuro, 1440 e 375. Observação: o texto da barra sobre a cena foi medido contra o papel a 90 % sobre o fundo de papel, não por amostragem de pixels da cena `ember`.
- `func` (critérios 11–13): padrões (400/400/0,8; 23 g em 94 g; 18 g; 5 × 270 g, 1.348 g); 7 pizzas = 1.122 g e 7 panetti desenhados; todos os ids dos ajustes; Feito persiste; timer roda/pausa/zera; diagnóstico aplica; retomar; troca de receita leva 6 pizzas; movimento reduzido sem figura fixa e `document.getAnimations().length === 0`. 0 falhas.
- `kb` (critério 14): Tab de ponta a ponta no desktop e no mobile, sem armadilha e sem foco coberto pelo palco. `wheel` (critério 16): 10 × `mouseWheel` de 100 = `scrollY` 1000. Sem `preventDefault`, sem `scroll-snap`.
- `perf` (CPU 4×, 150 ms de latência, ~400 kb/s): LCP 2,1 s no 375×812 e 0,26 s no 1440×900; CLS 0,002 e 0,03 (meta ≤ 0,02 só atingida no mobile); maior tarefa longa 57 ms; ≤ 3 figuras com `display` ativo.
- Peso: HTML gzip 45,6 KB (pt) e 43,6 KB (NY), meta ≤ 90 KB.

## Capturas
`design/jornada/qa/impl/` (ignorada pelo git): `e1/` (abertura, passagens, mobile), `e2/` (mise, s8, s14, claro/escuro, 1440 e 375), `e7/` (modo estático), `art/` (folhas de contato das composições), `e9/` (conjunto final).

## Problemas conhecidos e não verificado
- **Não verificado**: Safari/iOS (inclusive `#paint` na passagem e barra de URL dinâmica), Firefox (o motor `jsd` foi validado só no Chrome), aparelho real, leitor de tela, Lighthouse, desempenho de quadros em Android intermediário.
- CLS de 0,03 no desktop (abaixo de 0,1 mas acima da meta de 0,02): vem do preenchimento dos números e horários após a primeira pintura; não investigado a fundo.
- No mobile, entre o fim de um cartão e a chegada do próximo, a janela de leitura fica vazia por alguns instantes (o `padding-bottom` do ladrilho é a área útil, exigência da geometria da passagem); não afeta a leitura, mas pode parecer um vão.
- Sem JS a bandeja dos panetti e os potes da New York aparecem vazios (desenhados pelo JS). O anel do timer no modo estático mostra as faixas, sem preenchimento.
- Texto da barra sobre a cena `ember` no escuro medido só por cor; falta amostragem de pixels.
- A qualidade da ilustração usa os mesmos materiais e a mesma luz em todas as cenas, mas os estados mais "de gesto" (laminar, abrir) ficam mais esquemáticos que o forno e a bancada; vale uma rodada de refinamento do dono.
- A New York não tem páginas/cenas exclusivas além de `slice`; `sauce/ny` e `bowl/rest` foram pintadas de forma enxuta.

## Correções pós-auditoria
Origem: `04-auditoria.md` (0 P0, 6 P1, 18 P2). Medições com `tools/audit.mjs` (roteiros `checks tags`, `seam`, `contrast`, `func2`, `kb2`, `misc`) e `tools/cdp.mjs` (`tags`, `mobile`, `seam`, `func`, `checks`, `cls`, `fix`, este último novo). Capturas em `design/jornada/qa/fix/`. Nada commitado.

| Item | Mudança | Evidência |
|---|---|---|
| P1-1 etiquetas sobrepostas no prólogo | `at` de flour, water, salt, oil e yeast reposicionados em 3 fileiras, cada etiqueta sobre o seu objeto (`recipe.json › journey.mise`, 2 receitas) | `audit checks tags`: 0 colisões tag×tag e tag×cartão em 1440, 1920 e 375, nas 4 páginas, incluindo 1280×720 e 1024×768 |
| P1-2 etiquetas cortadas em 768×1024 | âncoras de `s1`/`s2` de y 176–288 para 200–312; `validate_journey` agora reprova âncora visível no mobile fora de x 640–1210, y 190–630 | tags em 768×1024: 0 cortadas; `s1-768x1024-light.png` |
| P1-3 contraste `--ember` | `--ember` claro de `#A85A0C` para `#9A5209` | `audit contrast`: 8.040 medições, 0 falhas |
| P1-4 retomar | `#resume` ganha `.primary` (preenchido, tomate) e "Começar do início" fica fantasma | `fix`: fundo de `#resume` rgb(184,50,26); `#go` transparente |
| P1-5 celular deitado 812×375 | no bloco de paisagem baixa: `--dock/--stage/--in-*` a 0, `scroll-padding` 0 e `.grain` oculto | `fix`: `#s8`, `#s2`, `#s14` com topo do ladrilho em 0 e topo do cartão em 238 de 375 px; `scroll-padding-top` 0; grão `none`; "Próxima" em `s2` leva a `s4` em 0 |
| P1-6 última passagem NY no tablet | ladrilhos do mobile ganham `min-height` = área útil (o `.last`, +1 px) | `audit seam`: 768×1024 em pt e NY, sobreposição 0,91–1,13 px e 1 px no motor JS |
| P2-1 CLS da abertura | abertura alinhada ao topo (`flex-start`), `h1` menor com `min-height` de 2 linhas (o salto vinha da troca de fonte, de 3 para 2 linhas) e `#nextEv` com espaço reservado | `cdp cls` (CPU 4×, rede lenta): 0,0013 (era 0,031–0,052) |
| P2-2 janela de leitura vazia | `padding-bottom` de 30vh como no plano, mais `min-height` = área útil (que é o que a geometria exige) | `seam`/`mobile`: 0 falhas; o desvio do plano (padding = área útil) deixou de existir |
| P2-3 sem JS | `#qty` com `value`, `#qLbl` com texto, `#sum` e `#dlbl` preenchidos pelo pré-render (a lógica da abertura foi para `app.js`); bandeja e potes desenhados no build (`default_n`, `balls_svg`, `pots_svg`); controles inertes escondidos com `html:not(.js)`; "Começar" vira link para a 1ª etapa | `cdp fix` com JS desligado antes de navegar: valor 800, rótulo e resumo presentes, 15 panetti, 6 potes na NY, `#go`/`#openAdj` ocultos |
| P2-4 âncora ao abrir no celular | após `fonts.ready`, `scrollTo(restY)` instantâneo quando o hash é um ladrilho | `fix` em 375×812: `#s8` e `#s12` com topo em 377 = 377 esperado |
| P2-5 foco sob a doca | `scroll-padding-bottom: var(--dock)` | `audit kb2`: 0 casos nos 4 modos |
| P2-6 rótulo = texto visível | `aria-label` removido de `#openAdj` e `#dlbl` (nome vem do texto; descrição em `title`) | `fix`: ambos sem `aria-label` |
| P2-7 troca de receita | seção "Receita" no diálogo Ajustes; links de receita do rodapé com `data-recipe`/`data-ls` | `fix`: 2 cartões no diálogo; rodapé grava `newyork-v1:p = {mode:pizza, pizzas:6}` |
| P2-8 "un" fixo | `js.unitPizza` no i18n (`un`/`pcs`) | `fix`: `/en/` mostra `pcs` |
| P2-9 paridade pt/en | `check_parity()` no build (chaves recursivas de i18n e de cada receita; tamanho de regras, glossário, diag; id, dica e nº de itens de cada etapa) | provado: uma chave só no pt derruba o build com "paridade pt/en" |
| P2-10 etiquetas longe do objeto | `at` aproximados dos objetos em `s4`–`s13` e NY equivalentes, e um alfinete vermelho em CSS (`.tag::before`) | `qa/fix/mise-…`, `s8-…` |
| P2-14 manutenção | removidas variáveis mortas e `nxt_link` duplicado; `data-open-adj` removido | build ok |
| P2-15 alvos de 43 px no menu de idioma | `.lang li a{min-height:44px}` | CSS |
| P2-17 zero à esquerda | "Continuar na etapa 07" e "etapa 07 de 13" | `fix`: texto de `#resume` "…etapa 07 · Dividir e bolear" |
| P2-18 timer no celular | relógio grande oculto visualmente no mobile (continua para leitor de tela); o tempo fica no anel e no mini-timer | `fix`: `#clock` 1×1 px em 375 |

Regressão: `build.py` ok; JSON-LD 4/4 idêntico; `cdp checks` (6 viewports, 48 casos) 0 falhas; `tags`, `mobile`, `seam`, `func` 0 falhas.

### Pendências (não corrigidas, registradas)
- **P2-11** caixa segura passa 17–36 px por baixo dos cartões largos da abertura e do prólogo em 1024×768 e 1280×720 (só afeta a margem do assunto; nenhuma etiqueta fica sob o cartão).
- **P2-12** cenas de gesto (`s5`, `s7`, `s12`) mais esquemáticas: rodada de refinamento artístico.
- **P2-13** ponta de prateleira cortada à direita do cartão (`s1`, `s7`, 1440): cosmético.
- **P2-14 (parte)** `buildLD()` ainda roda depois de timer, diagnóstico e tema no `app.js`; sem efeito porque o JSON-LD vem do pré-render.
- **P2-16** LCP frio isolado por Google Fonts sem cache (fontes auto-hospedadas seriam a saída; precisa de aparelho real).

### Objetos cortados na emenda das passagens (validação final)
- **Causa:** cada figura é recortada pelo próprio palco; um objeto que atravessa a borda do palco (planta, pano desfocado, porta da geladeira) é cortado por uma linha dura em x ≈ 720 durante a passagem. Além disso a frente do balcão usava só `--br`, o que dava um degrau de cor na emenda quando a luz mudava.
- **Mudança:** (1) as camadas da arte ficam num `.stage-in` com máscara de esmaecimento horizontal (`--fade: clamp(40px, 6vw, 120px)`), desligada no modo estático e na paisagem baixa; o fundo (parede, bancada) não esmaece, então a emenda continua contínua e os objetos somem em vez de serem cortados; (2) os adereços de contexto da direita (manjericão, jarra, lata) foram recuados para x = 1330, inteiros em 1440 e 1920; (3) a frente do balcão passou a ser gradiente `--bl` → `--br`.
- **Checagem nova:** `cdp.mjs edge` captura o meio de cada passagem (1440×900 e 1920×1080, claro e escuro) e reprova se alguma linha de pixels (fora de ±5 px da quina da bancada) tiver salto de cor > 36 entre as colunas seam−3 e seam+3.
- **Evidência:** `edge` com 64 medições em `/pt/` e 56 em `/pt/new-york/`, 0 falhas (antes da correção, 13 falhas só na quina, que a checagem agora ignora de propósito; a primeira versão da checagem também pegou o degrau da frente do balcão em `s1→frio1`); capturas `qa/fix2/pass-*` olhadas; `cdp checks`, `tags`, `seam`, `audit checks tags` (só as pendências P2-11), `build.py` ok e JSON-LD 4/4 idêntico.
