# Status da jornada "Piano Sequenza" — ponto de retomada

Atualizado em 16/nov/2026. Branch `redesign-imersivo` (nada enviado ao GitHub; o site publicado ainda é a versão 3D antiga).

## Histórico de commits nesta branch
- `1f832ec` — redesign "Luce di Forno" (foto como cenário, sem 3D). Base anterior.
- commit seguinte — jornada "Piano Sequenza" implementada (E0–E9) + auditoria em andamento (WIP).

## Pipeline e estado
| Etapa | Modelo | Estado | Arquivo |
|---|---|---|---|
| Estratégia + protótipo | Fable 5.2 | concluído, aprovado pelo dono | `01-estrategia.md`, `prototipo/index.html` |
| Arquitetura | Opus | concluído | `02-arquitetura.md` |
| Implementação E0–E9 | Sonnet | concluído | `03-implementacao.md` |
| Auditoria E10 | Opus | concluída: 0 P0 · 6 P1 · 18 P2 | `04-auditoria.md` |
| Correções pós-auditoria | Sonnet | concluídas (6 P1, P2 principais, objetos cortados na emenda) | `03-implementacao.md` § Correções |
| Validação final + relatório | Opus (sessão principal) | concluída | `05-relatorio-final.md` |

## Como retomar
1. Ver se `04-auditoria.md` está completo (contagem P0/P1/P2 e lista do que foi testado no final). Se não, pedir a um agente Opus para concluir a auditoria a partir do que já existe (capturas em `design/jornada/qa/audit/`, ignoradas pelo git).
2. Passar as não conformidades a um agente Sonnet para corrigir (sem commitar), com verificação via CDP (`design/jornada/tools/cdp.mjs`).
3. Validação final na sessão principal: `python3 build.py` → ok; capturas CDP (375×812, 768×1024, 1280×720, 1440×900, claro/escuro, reduced-motion) nas 4 páginas; interações.
4. Perguntar ao dono antes de push/publicação.

## Pontos já observados
- Barra inferior mobile repete o rótulo ("Geladeira · Geladeira · noite") — `qa/impl/e9/frio1-375x812-dark.png`.
- Conhecidos pelo implementador: CLS desktop 0,03 (meta 0,02); janela de leitura vazia entre cartões no celular; sem JS a bandeja de panetti e os potes NY ficam vazios; cenas de gesto mais esquemáticas; contraste não medido na New York.

## Ambiente
- Servidor: `.claude/launch.json` → `napoliprotocol` (porta 8766, `docs/`) e `jornada-prototipo` (8768, raiz).
- Originais de fotos em `src/photos/originals/` (gitignored). Capturas de QA em `design/qa/`, `design/jornada/qa/` (gitignored).
- Limites de uso: os agentes Fable/Opus pararam várias vezes por limite de 5 h; retomar com SendMessage ou novo agente a partir dos arquivos.

## Publicado
16/nov/2026: `main` avançada até fe362d7 e enviada; GitHub Pages implantou (pages-build-deployment ok). napoliprotocol.com serve a jornada; branch `redesign-imersivo` também no GitHub.

## 22/nov/2026 — duas sessões em paralelo, um commit
`cd3979f` (receita sem bassinage, temperatura da água, diário de fornadas) foi commitado pela sessão de orquestração a partir da árvore inteira e levou junto as correções de front-end de outra sessão, que não aparecem na mensagem:
- **Retomar:** "Continuar" aponta para a primeira etapa não marcada como Feito e só aparece depois de algum Feito; rolar não grava mais posição (`:last` removido). `src/journey.js`.
- **Botão Continuar:** "Continuar · etapa NN" com o nome da etapa numa segunda linha (antes quebrava "Pós-/azeite"). i18n `resume` + `#resume` em `style.css`.
- **Tabela da mise en place:** cabeçalhos curtos e colunas mais justas quando o contêiner tem ≤ 440 px (container query); sombra de rolagem na borda. Cabe sem rolar em 375, 1024 e 1280.
- **Etiqueta "fermento" da mise:** x 1000 → 975 nas duas receitas; não fica mais sob o trilho em 1024×768 (era P2-11).

Validado com tudo junto (12 etapas): `cdp.mjs checks` nas 4 páginas × 375/1024/1440 × com/sem movimento → 96 casos, 0 falhas; retomar, tabela, trilho e diário testados no navegador. Referência de JSON-LD da napolitana atualizada para o texto commitado ("a 36 °C", sem "~").
