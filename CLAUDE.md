# context-saver

Economizador de tokens para Claude Code e GitHub Copilot no VSCode. Um hook
`PreToolUse` intercepta comandos de terminal verbosos e os reescreve para rodar
através de `econ.js run`, que executa o comando real, comprime a saída com um
filtro e devolve só o resumo ao agente — preservando o exit code. Node.js puro,
ESM, zero dependências, sem `npm install`.

## Como rodar

- Testes: `node --test` (usa apenas o test runner nativo do Node).
- CLI: `node econ.js <install [claude|copilot] | on | off | status | stats | show <id> | doctor [--fix] | hook | run <cmd>>`.

## Arquitetura

- `econ.js` — entrada CLI; despacha os subcomandos.
- `src/hook-adapter.js` — lê o JSON do hook (Claude `tool_input.command`,
  Copilot `toolArgs.command`), decide se reescreve e monta a resposta. Só reescreve
  comandos que casam um filtro específico; detecta o shell (bash/powershell) e faz
  anti-loop quando o comando já contém `econ.js`.
- `src/runner.js` — reexecuta o comando no mesmo shell do agente via `spawnSync`,
  aplica o filtro específico e, se ele não comprimir, tenta o filtro genérico como
  fallback; registra a métrica de economia.
- `src/filters/*.js` — cada família exporta `{ name, test(command), run({command,
  stdout, stderr, exitCode}) }` e retorna `null` quando não deve comprimir.
  `src/filters/index.js` monta `ALL_FILTERS` (mais específico primeiro). O
  `generic` NÃO entra em `ALL_FILTERS`: é fallback só dentro do runner.
- `src/tee.js` / `src/show.js` — salvam a saída completa em arquivo temp com um id
  e recuperam trechos (`econ show <id> --lines A-B --grep X`).
- `src/metrics.js` / `src/tokens.js` — telemetria em `~/.context-saver/metrics.jsonl`
  (`econ stats`); estimador de tokens (~1 token por 4 chars).
- `src/doctor.js` — audita boas práticas (CLAUDE.md, copilot-instructions,
  .gitignore, .claudeignore, nº de MCPs); `applyFix` cria ignores/instruções.
- `src/state.js` / `src/installer.js` — liga/desliga em `~/.context-saver/state.json`
  e instala hooks (Claude em `~/.claude/settings.json`, Copilot em
  `~/.copilot/hooks/context-saver.json`).

## Decisão de design importante

Embrulhar TODO comando é perigoso: `spawnSync` bloqueia até o fim, então comandos
interativos ou de streaming (`npm run dev`, `tail -f`, `vim`, `git rebase -i`)
travariam. Por isso o hook só embrulha famílias específicas conhecidas (que
terminam), e o filtro genérico só melhora a compressão de um comando já embrulhado.
Ao adicionar filtros, preserve essa fronteira.

## Convenções

- Zero comentários no código, sem exceção.
- Zero dependências; só APIs nativas do Node.
- Todo filtro novo: criar `src/filters/<familia>.js`, registrar em `index.js` antes
  do fallback, e escrever `test/filters.<familia>.test.js`.
- Commits limpos e mínimos, sem `Co-Authored-By`.
