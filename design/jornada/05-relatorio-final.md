# 05 · Relatório final — jornada "Piano Sequenza"

Branch `redesign-imersivo`, local (não enviada). Pipeline: Fable 5.2 (estratégia + protótipo, aprovado pelo dono) → Opus (arquitetura) → Sonnet (E0–E9) → Opus (auditoria E10: 0 P0 · 6 P1 · 18 P2) → Sonnet (correções) → validação final na sessão principal.

## O que existe
- Abertura: "Qual pizza, e quanta?" — receita (Napolitana/New York) + farinha ⇄ nº de pizzas → Começar; "Continuar na etapa NN" quando há progresso.
- Jornada: 9 composições SVG pintadas (22 estados), uma bancada em plano-sequência; rolagem nativa move a câmera lateralmente (view-timeline + fallback JS), sem scroll-jacking; luz da parede marca o momento do dia. Celular: palco fixo no topo, cartão rola por baixo.
- Ferramentas na jornada: etiquetas de quantidade nas cenas e no cartão, horário do cronograma por etapa, Feito/progresso/retomar, Ajustes (`<dialog>`) com parâmetros, agenda e troca de receita, timer na cena do forno + mini-timer, epílogo com diagnóstico, regras, glossário e Sobre (fotos reais com crédito).
- Removido: cenário fotográfico (scene.js, docs/img/scene), player SVG, GSAP, illustrations.js. `docs/` ~11 MB → 6,8 MB.

## Validação final (sessão principal, CDP com emulação de dispositivo)
- `python3 build.py` → ok; JSON-LD idêntico à referência nas 4 páginas (`ld.py cmp`).
- `cdp.mjs checks`: /pt/ e /en/new-york/ em 375×812, 768×1024, 1440×900, claro/escuro, com e sem movimento → 0 falhas (48 casos); /en/new-york/ 375/1440 claro/escuro → 0 falhas.
- `cdp.mjs edge` (/pt/new-york/): 120 medições, 0 falhas.
- Capturas olhadas: mise en place desktop (etiquetas sem sobreposição), etapa 07 no celular (cena visível acima do cartão), passagens desktop.
- Defeito achado nesta etapa e corrigido: objetos cortados por linha vertical dura na emenda entre cenas (vaso, pano, porta da geladeira). Agora a camada de objetos dissolve na borda (máscara de 40–120 px) e há checagem automática.

## Pendências conhecidas
- Na passagem, objetos grandes (janela) aparecem meio dissolvidos por um instante — efeito suave, não corte.
- P2-11 caixa segura sob cartões largos em 1024×768/1280×720; P2-12 cenas de gesto esquemáticas; P2-13 ponta de prateleira cortada junto ao cartão; P2-16 LCP frio por fontes do Google sem cache.
- Imagens de compartilhamento (OG) ainda na identidade antiga; "Ver o gesto" adiado.
- Não testado: Safari/iOS, Firefox, aparelho real, leitor de tela real, Lighthouse, Wake Lock real.
