# context-saver

Economizador de tokens para Claude Code e GitHub Copilot no VSCode. Um hook
`PreToolUse` intercepta comandos de terminal verbosos e os reescreve para rodar
através de `econ.js run`, que executa o comando real, comprime a saída com um
filtro e devolve só o resumo ao agente — preservando o exit code. Node.js puro,
ESM, zero dependências, sem `npm install`.

## Como rodar

- Testes: `npm test` (`node --test test/*.test.js`, só o test runner nativo do Node).
- CLI: `node econ.js <install [claude|copilot] | on | off | status | stats | show <id> | doctor [--fix] | hook | run <cmd>>`.

## Arquitetura

- `econ.js`: entrada CLI; despacha os subcomandos.
- `src/hook-adapter.js`: lê o JSON do hook (Claude e Codex `tool_input.command`,
  Copilot `toolArgs.command`), decide se reescreve e monta a resposta mantendo os
  demais argumentos da ferramenta. Detecta o shell (bash/powershell) e faz anti-loop
  quando o comando já contém `econ.js`.
- `src/guard.js`: regras de quando é seguro embrulhar. Comando simples (sem
  encadeamento, pipe, substituição ou redirecionamento fora de aspas), sem `find`
  com ação que apaga, executa ou escreve, e sem execução contínua (watch, servidor,
  `docker compose up` sem `-d`, `logs -f`, scripts npm em watch lidos do
  `package.json` do cwd).
- `src/runner.js`: reexecuta o comando no mesmo shell do agente via `spawnSync`,
  aplica o filtro específico e, se ele não comprimir, tenta o filtro genérico como
  fallback; registra a métrica de economia.
- `src/filters/*.js`: cada família exporta `{ name, test(command), run({command,
  stdout, stderr, exitCode}) }` e retorna `null` quando não deve comprimir. O `test`
  casa só no primeiro token. `src/filters/index.js` monta `ALL_FILTERS` (mais
  específico primeiro). O `generic` NÃO entra em `ALL_FILTERS`: é fallback só
  dentro do runner.
- `src/tee.js` / `src/show.js`: salvam a saída completa em `<ECON_HOME>/tee/<id>.log`
  (pasta 0700, arquivo 0600, apagado após 24h); o resumo informa o caminho absoluto e
  `econ show <id> --lines A-B --grep X` recupera trechos pelo id.
- `src/metrics.js` / `src/tokens.js`: telemetria em `<ECON_HOME>/metrics.jsonl`
  (`econ stats`); estimador de tokens (~1 token por 4 chars).
- `src/doctor.js`: audita boas práticas (CLAUDE.md, copilot-instructions,
  .gitignore, .claudeignore, nº de MCPs); `applyFix` cria ignores/instruções.
- `src/state.js` / `src/installer.js`: `stateDir()` resolve o `ECON_HOME` (padrão
  `~/.context-saver`) no momento da chamada; liga/desliga em `state.json` e instala
  hooks (Claude em `~/.claude/settings.json`, Copilot em
  `~/.copilot/hooks/context-saver.json`, Codex em `~/.codex/hooks.json`).
- `src/lazy/state.js`: estado por agente do modo econômico de código (nível de
  sessão + nível padrão) em `<ECON_HOME>/lazy-state-<agente>.json`.
- `src/lazy/instructions.js`: lê `skills/econ-lazy/SKILL.md` e filtra pelo nível
  ativo (lite/full/ultra).
- `src/lazy/hooks.js` / `src/lazy/dispatch.js`: lógica dos hooks `SessionStart`/
  `UserPromptSubmit`/`SubagentStart` e formatação da saída por agente.
- `src/lazy/debt.js`: scanner determinístico de marcadores `econ: <limite>,
  <gatilho>` (`econ.js lazy debt`).
- `src/lazy/install.js`: construtores puros (sem I/O) dos hooks lazy pra
  Claude/Codex/Copilot.
- `src/lazy/setup.js`: instala/desinstala os hooks lazy, as 6 skills e a
  statusline (Claude Code) usando os construtores de `install.js`, independente
  do hook de compressão de saída.

## Decisão de design importante

Embrulhar TODO comando é perigoso por dois motivos. Primeiro, `spawnSync` bloqueia
até o fim, então comandos interativos, de watch ou de streaming (`npm run dev`,
`tail -f`, `vim`, `git rebase -i`, `ng test` com Karma) travariam e o agente não
receberia nada. Segundo, o comando reescrito sai com `permissionDecision: "allow"`,
então tudo que é embrulhado pula o prompt de permissão. Por isso o hook só embrulha
comando simples cuja família, no primeiro token, termina e não tem efeito colateral
relevante. Essa fronteira mora em `src/guard.js`, e o filtro genérico só melhora a
compressão de um comando já embrulhado. Ao adicionar filtros ou famílias, preserve
essa fronteira e cubra em `test/guard.test.js` qualquer variante que não termine.

## Convenções

- Zero comentários no código, sem exceção.
- Exceção única: comentário `econ: <limite>, <gatilho>` deixado pelo modo econômico
  de código pra marcar atalho deliberado — é dívida rastreável, não explicação de
  código. Rastreável via `econ.js lazy debt`.
- Zero dependências; só APIs nativas do Node.
- Todo filtro novo: criar `src/filters/<familia>.js` com `test` ancorado no primeiro
  token, registrar em `index.js` antes do fallback, e escrever
  `test/filters.<familia>.test.js`.
- Todo arquivo de teste começa com `import './isolate.js';`, que aponta o `ECON_HOME`
  para uma pasta temporária: teste nunca toca no `~/.context-saver` real.
- Commits limpos e mínimos, sem `Co-Authored-By`.
