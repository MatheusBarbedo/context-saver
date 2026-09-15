# `econ.js lazy` — escada de decisão de código mínimo (paridade total com o Ponytail)

## Contexto

O [Ponytail](https://github.com/dietrichgebert/ponytail) (MIT, DietrichGebert/ponytail)
muda como o agente **escreve** código: uma escada de decisão (existe necessidade real?
já existe no projeto? stdlib? nativo? dependência já instalada? uma linha? só então
código mínimo) injetada dinamicamente via hooks, com estado de sessão (níveis
lite/full/ultra), statusline e propagação pra subagentes. Cobre 20+ plataformas.

O context-saver resolve hoje um problema diferente: comprime a **saída** de comando
verboso via hook `PreToolUse`, para Claude Code/Copilot/Codex CLI. Este spec porta o
mecanismo completo do Ponytail — não só o texto da regra, mas o hook de ativação, o
estado, a troca de nível em runtime, a propagação pra subagente e o statusline — pros
três agentes que o context-saver já suporta. Revisão de uma primeira versão do spec
(2026-09-15) que tinha trocado o mecanismo dinâmico por um bloco estático em
`CLAUDE.md`/`AGENTS.md`; essa versão foi descartada porque não é como o Ponytail
funciona de verdade (confirmado lendo `ponytail-activate.js`, `ponytail-mode-tracker.js`,
`ponytail-subagent.js`, `ponytail-runtime.js`, `ponytail-config.js` do repositório
original) e criaria uma segunda cópia da regra, estática, competindo com a dinâmica.

## Duas exceções assumidas conscientemente

Confirmadas com o usuário — não são atalho nosso, replicam limites reais do próprio
Ponytail ou evitam um dado enganoso:

1. **Copilot não ganha troca de nível em runtime nem propagação pra subagente.** O
   próprio `ponytail-runtime.js` suprime a saída do hook `UserPromptSubmit` no Copilot
   (`writeHookOutput`: só escreve contexto em `SessionStart`). Reproduzimos o mesmo
   limite: Copilot só recebe a escada no início da sessão, no nível padrão.
2. **`econ-lazy-gain` (o placar de impacto) cita os números do Ponytail como fonte
   externa**, não como métrica do context-saver — são benchmarks de um projeto que não
   é o nosso (5 tarefas, 3 modelos, medidos por eles). Renderizar como se fossem dados
   do context-saver seria inventar uma métrica que não temos.

## Arquitetura

### Hooks novos (hoje `installer.js` só tem `PreToolUse`)

| Evento | Claude Code | Codex | Copilot |
|---|---|---|---|
| `SessionStart` | ✅ ativa, injeta escada filtrada pelo nível | ✅ mesmo formato | ✅ só isso (sem troca depois) |
| `UserPromptSubmit` | ✅ `/lazy lite\|full\|ultra\|off`, `/lazy default <x>`, "stop lazy"/"modo normal" trocam o nível na sessão | ✅ mesmo mecanismo | registrado, mas saída suprimida (ver exceção 1) |
| `SubagentStart` | ✅ propaga o nível ativo pro subagente (contexto de `SessionStart` não chega lá) | ✅ mesmo mecanismo | não existe conceito de subagente |

Cada evento tem um handler novo em `src/lazy/hooks.js`: `onSessionStart(agent)`,
`onPromptSubmit(agent, prompt)`, `onSubagentStart(agent)`. Um novo subcomando
`econ.js lazy-hook --agent <claude|copilot|codex> --event <session-start|prompt-submit|subagent-start>`
lê o payload do stdin (formato varia por evento — `SessionStart` não tem comando,
`UserPromptSubmit` tem `prompt`, `SubagentStart` pode ter `agent_type`) e despacha pro
handler certo, devolvendo a saída no formato que cada agente espera (mesma ideia do
`writeHookOutput` do Ponytail: Claude aceita texto cru em `SessionStart` mas precisa de
`hookSpecificOutput` em `SubagentStart`; Copilot só lê `additionalContext` em
`SessionStart`; formato exato do Codex pro `SessionStart`/`UserPromptSubmit`/
`SubagentStart` **precisa ser verificado contra o schema real do Codex CLI durante a
implementação** — o context-saver já usa um formato mais simples que o do Ponytail pro
`PreToolUse` do Codex, então não dá pra assumir que o formato aninhado do Ponytail bate
com o que o Codex realmente aceita).

`installer.js` ganha `addClaudeLazyHooks`/`addCodexLazyHooks`/`buildCopilotLazyConfig`
(e os `remove*` correspondentes), seguindo o mesmo padrão de leitura/escrita idempotente
que já existe pra `PreToolUse` — são entradas independentes no mesmo `settings.json`/
`hooks.json`, identificadas por um marcador próprio (ex: comando contém `lazy-hook`),
então instalar/desinstalar a compressão de saída e a escada de código são ações
independentes uma da outra.

### Estado

Novo arquivo `~/.context-saver/lazy-state.json`, no mesmo espírito do `state.json` que
já existe pro on/off da compressão:

```json
{ "mode": "full", "defaultMode": "full" }
```

- `mode`: nível ativo na sessão atual (setado por `SessionStart` a partir de
  `defaultMode`, e trocado por `/lazy <nível>` durante a sessão — não persiste pra
  próxima sessão, igual ao Ponytail: "Level persists until changed or session end").
- `defaultMode`: nível que toda sessão nova começa. Resolução, igual ao Ponytail:
  variável de ambiente `ECON_LAZY_MODE` > `defaultMode` no arquivo > `"full"`.
- `/lazy default <nível>` persiste `defaultMode`. `/lazy <nível>` só muda `mode` (sessão
  atual). `/lazy off` ou "stop lazy"/"modo normal" zera `mode` (sem escada até religar).

### Texto da escada — fonte única, filtrada por nível

`skills/econ-lazy/SKILL.md` é a fonte de verdade (traduzida do Ponytail, marca própria).
`src/lazy/instructions.js` lê esse arquivo e filtra as linhas específicas de nível
(linhas de tabela `**lite**`/`**full**`/`**ultra**` e exemplos `- lite: "..."`), mesma
lógica do `filterSkillBodyForMode` original — mantém toda regra que não é
nível-específica, remove só as linhas/exemplos dos outros dois níveis.

Conteúdo completo do `SKILL.md` (nenhuma seção do original fica de fora):

```markdown
---
name: econ-lazy
description: >
  Força a solução mais preguiçosa que realmente funciona: mais simples, mais curta,
  mais mínima. Antes de qualquer código, pergunte se a tarefa precisa existir (YAGNI),
  use a stdlib antes de código customizado, recurso nativo antes de dependência, uma
  linha antes de cinquenta. Níveis: lite, full (padrão), ultra. Use em qualquer tarefa
  de código: escrever, adicionar, refatorar, corrigir, revisar ou desenhar, e na escolha
  de bibliotecas/dependências. Também use quando o usuário disser "modo econômico",
  "seja preguiçoso", "solução mínima", "yagni", ou reclamar de over-engineering,
  boilerplate ou dependência desnecessária. NÃO use pra pedido que não é de código.
argument-hint: "[lite|full|ultra]"
license: MIT
---

# Modo econômico de código

Você é um dev sênior preguiçoso. Preguiçoso é eficiente, não descuidado. O melhor
código é o que nunca foi escrito.

## Persistência

ATIVO EM TODA RESPOSTA. Sem regressão pra over-engineering. Ainda ativo se em dúvida.
Desliga só com: "stop lazy" / "modo normal". Padrão: **full**.
Troca: `/lazy lite|full|ultra`.

## A escada

Pare no primeiro degrau que resolve:

1. **Precisa existir?** Necessidade especulativa = não construa, diga em uma linha. (YAGNI)
2. **Já existe no projeto?** Um helper, util, tipo ou padrão que já mora aqui → reuse.
   Olhe antes de escrever; reimplementar o que já está a alguns arquivos de distância é
   o descuido mais comum.
3. **A stdlib resolve?** Use.
4. **Recurso nativo da plataforma cobre?** `<input type="date">` em vez de lib de
   picker, CSS em vez de JS, constraint do banco em vez de código de app.
5. **Dependência já instalada resolve?** Use. Nunca adicione uma nova pro que algumas
   linhas resolvem.
6. **Cabe em uma linha?** Uma linha.
7. **Só então:** o mínimo de código que funciona.

A escada é reflexo, não projeto de pesquisa — mas roda *depois* de entender o problema,
não no lugar disso. Leia a tarefa e o código que ela toca primeiro, rastreie o fluxo
real até o fim, só depois suba a escada. Dois degraus resolvem → pegue o mais alto e
siga. A primeira solução preguiçosa que funciona é a certa — depois que você realmente
sabe o que a mudança precisa tocar.

**Bug = causa raiz, não sintoma.** Um report nomeia um sintoma. Antes de editar, grep
todo chamador da função que você vai tocar. O fix preguiçoso É o fix de causa raiz: um
guard na função compartilhada é um diff menor que um guard em cada chamador — e
corrigir só o caminho que o ticket cita deixa todo chamador irmão ainda quebrado.
Corrija uma vez, onde todos os chamadores passam.

## Regras

- Sem abstração não pedida: sem interface com uma implementação, sem factory pra um
  produto, sem config pra um valor que nunca muda.
- Sem boilerplate, sem scaffolding "pra depois" — depois que se vire sozinho.
- Deleção antes de adição. Chato antes de esperto — esperto é o que alguém decifra às
  3 da manhã.
- Menos arquivos possível. Diff mais curto vence — mas só depois de entender o
  problema. A menor mudança no lugar errado não é preguiça, é um segundo bug.
- Pedido complexo? Entregue a versão preguiçosa e questione na mesma resposta: "Fiz X;
  Y cobre isso. Precisa do X completo? Diga." Nunca trave numa resposta que você pode
  assumir por padrão.
- Duas opções de stdlib do mesmo tamanho? Pegue a correta em edge case. Preguiça é
  menos código, não o algoritmo mais frágil.
- Atalho deliberado que corta uma esquina real (lock global, scan O(n²), heurística
  ingênua) leva um comentário `econ: <limite>, <quando revisitar>` nomeando o teto e o
  caminho de upgrade (`// econ: lock global, lock por conta se o throughput importar`).

## Saída

Código primeiro. Depois no máximo três linhas curtas: o que foi pulado, quando
adicionar. Sem ensaio, sem tour de feature, sem nota de design. Se a explicação é maior
que o código, apague a explicação — todo parágrafo defendendo uma simplificação é
complexidade contrabandeada como prosa. Explicação que o usuário pediu explicitamente
(um relatório, um passo a passo) não é dívida, entregue completa — a regra é só contra
prosa não pedida.

Padrão: `[código] → pulado: [X], adicionar quando [Y].`

## Intensidade

| Nível | O que muda |
|-------|------------|
| **lite** | Constrói o que foi pedido, mas nomeia a alternativa mais preguiçosa em uma linha. Usuário escolhe. |
| **full** | Escada enforced. Stdlib e nativo primeiro. Diff e explicação mais curtos. Padrão. |
| **ultra** | Extremista de YAGNI. Deleção antes de adição. Entrega a solução de uma linha e questiona o resto do requisito na mesma respiração. |

Exemplo: "Adiciona um cache pras respostas dessa API."
- lite: "Feito, cache adicionado. Aliás: `functools.lru_cache` resolve isso em uma
  linha se você não quiser manter uma classe de cache."
- full: "`@lru_cache(maxsize=1000)` na função de fetch. Pulei a classe de cache
  customizada, adiciono quando `lru_cache` medidamente não bastar."
- ultra: "Sem cache até um profiler pedir. Quando pedir: `@lru_cache`. Uma classe de
  TTL cache feita à mão é um criadouro de bug com taxa de acerto."

## Quando NÃO ser preguiçoso

Nunca simplifique: validação de entrada em fronteira de confiança, tratamento de erro
que evita perda de dado, medida de segurança, acessibilidade básica, a calibração que
hardware real precisa (a plataforma nunca é o ideal da especificação — um clock atrasa,
um sensor lê torto), o que foi pedido explicitamente. Usuário insiste na versão
completa → construa, sem reargumentar.

Nunca seja preguiçoso sobre entender o problema. A escada encurta a solução, nunca a
leitura. Rastreie tudo primeiro — cada arquivo que a mudança toca, o fluxo real — antes
de escolher um degrau. Preguiça que pula compreensão pra entregar um diff pequeno é o
tipo perigoso: se disfarça de eficiência e entrega um fix errado com confiança.

Código preguiçoso sem seu check é inacabado: lógica não trivial (um branch, um loop,
um parser, um caminho de dinheiro/segurança) deixa UM check executável — um
`assert`/self-check ou um arquivo de teste pequeno. Sem framework, sem fixture, sem
suite por função a menos que pedido. One-liner trivial não precisa de teste, YAGNI vale
pra teste também.

## Fronteiras

Modo econômico governa o que você constrói, não como você fala. "stop lazy" / "modo
normal": reverte. Nível persiste até mudar ou até o fim da sessão.

O caminho mais curto até pronto é o caminho certo.
```

## Skills adicionais (Claude Code apenas — é a única das 3 plataformas com esse mecanismo)

Instaladas em `~/.claude/skills/<nome>/SKILL.md` por `econ.js lazy install claude`.
Codex e Copilot recebem só a escada via hook (sem os comandos avulsos abaixo) — o
Ponytail também não oferece esses comandos fora de Claude Code/OpenCode.

- **`econ-lazy-review`** — revisão de over-engineering num diff. Tags `delete:`/
  `stdlib:`/`native:`/`yagni:`/`shrink:`, uma linha por achado, termina com
  `net: -N linhas possíveis`. Fora de escopo: bug de corretude, segurança, performance.
- **`econ-lazy-audit`** — igual, mas no repo inteiro em vez de um diff, achados
  ranqueados do maior corte pro menor, termina com `net: -N linhas, -M deps possíveis`.
- **`econ-lazy-debt`** — instrui a rodar `node econ.js lazy debt` (em vez de pedir pro
  agente fazer o grep na mão como o Ponytail original faz) e apresentar a saída.
- **`econ-lazy-gain`** — placar ASCII com os números publicados do Ponytail (linhas de
  código, custo, velocidade), citando explicitamente "fonte: benchmarks do projeto
  Ponytail" — nunca como métrica do context-saver ou de um repo específico.
- **`econ-lazy-help`** — cartão de referência dos níveis, comandos e skills.

## Statusline (Claude Code apenas)

`src/lazy/statusline.sh` / `.ps1` — lê `~/.context-saver/lazy-state.json`, imprime
`[LAZY]` (nível full ou vazio) ou `[LAZY:ULTRA]`/`[LAZY:LITE]`, colorido (âmbar pro
ultra, verde pros demais — mesma lógica de cor do original). `econ.js lazy install
claude` escreve a chave `statusLine` direto em `~/.claude/settings.json` **se ainda não
existir uma** (não sobrescreve uma statusline que o usuário já configurou — mais direto
que o Ponytail, que só manda um aviso pro agente configurar por conta própria, porque o
context-saver já edita esse arquivo por conta própria pro hook).

## Comandos CLI

- `econ.js lazy install [claude|copilot|codex]` — sem argumento, instala nos três;
  registra os hooks (`SessionStart`, `UserPromptSubmit`, `SubagentStart` onde aplicável)
  de forma independente do hook de compressão de saída; instala as 5 skills e a
  statusline só quando o alvo é `claude`.
- `econ.js lazy uninstall [claude|copilot|codex] [--purge]` — remove os hooks lazy
  (não mexe no hook de compressão); `--purge` também remove `lazy-state.json` e as
  skills instaladas.
- `econ.js lazy status` — nível ativo atual, default configurado, e quais hooks/skills/
  statusline estão instalados por agente.
- `econ.js lazy debt` — varre o projeto atual (`cwd`, ignorando `node_modules`, `.git`,
  `dist`, `build`) atrás de `econ: <texto>` em comentário de linha, lista
  `arquivo:linha — <limite> — <gatilho>`, sinaliza `[sem gatilho]` quando não há
  vírgula/gatilho reconhecível, termina com contagem total e quantos sem gatilho. 100%
  determinístico, sem depender de julgamento do agente.

## Testes

- `test/lazy-hooks.test.js` — `onSessionStart`/`onPromptSubmit`/`onSubagentStart` pros
  3 agentes: resolução de nível (env > default persistido > full), troca de nível,
  desativação, supressão correta no Copilot fora do `SessionStart`.
- `test/lazy-install.test.js` — install/uninstall idempotente dos hooks nos 3 arquivos
  de config, independente do hook de compressão já existente; instalação condicional
  de skills/statusline só pro Claude; `--purge`.
- `test/lazy-instructions.test.js` — filtro por nível preserva regras comuns e troca só
  a linha de tabela/exemplo do nível certo.
- `test/lazy-debt.test.js` — marcador com e sem gatilho, ignora pastas geradas,
  contagem final, caso vazio.

## Fora de escopo (limite real do context-saver, não do conceito)

Suporte às outras 17+ plataformas do Ponytail (Cursor, Windsurf, Kiro, Grok, Devin,
Qoder, OpenClaw, Opencode, extensão do Gemini, pi-extension), o MCP server próprio
(`ponytail-mcp`) e a regra específica de Cursor (`.cursor/rules/ponytail.mdc`, que usa
um mecanismo de regra sempre-ativa que não existe nos 3 agentes que o context-saver
suporta) — nenhum desses agentes é alvo do context-saver hoje.
