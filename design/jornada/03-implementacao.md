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
