# Instruções do projeto — context-saver

Economizador de tokens para Claude Code e GitHub Copilot. Um hook `PreToolUse`
intercepta comandos de terminal verbosos, reescreve para `econ.js run`, executa o
comando real, comprime a saída com um filtro e devolve só o resumo ao agente,
preservando o exit code. Node.js puro, ESM, zero dependências, sem `npm install`.

## Como rodar

- Testes: `npm test` (`node --test test/*.test.js`).
- CLI: `node econ.js <install [claude|copilot] | on | off | status | stats | show <id> | doctor [--fix] | hook | run <cmd>>`.

## Estrutura

- `econ.js` despacha os subcomandos.
- `src/hook-adapter.js` decide se reescreve o comando e mantém os demais argumentos
  da ferramenta; detecta o shell e faz anti-loop com `econ.js`.
- `src/guard.js` define quando é seguro embrulhar: comando simples, família no
  primeiro token, sem `find` destrutivo, sem background e sem execução contínua.
- `src/runner.js` reexecuta via `spawnSync`, aplica o filtro específico e, se falhar,
  o filtro genérico como fallback; grava a métrica.
- `src/filters/*.js`: cada família exporta `{ name, test, run }` e retorna `null`
  quando não deve comprimir. `src/filters/index.js` ordena do mais específico ao
  menos. O `generic` é fallback só no runner, fora de `ALL_FILTERS`.
- `src/tee.js`/`src/show.js` guardam a saída completa em `<ECON_HOME>/tee/` (0600,
  apagada após 24h) e recuperam por id; o resumo informa o caminho absoluto.
- `src/metrics.js`/`src/tokens.js` fazem telemetria em `<ECON_HOME>/metrics.jsonl`
  (padrão `~/.context-saver`).
- `src/doctor.js`, `src/state.js`, `src/installer.js` cuidam de auditoria, estado e
  instalação de hooks.

## Regras ao contribuir

- Zero comentários no código; zero dependências (só APIs nativas do Node).
- Nunca embrulhe comandos interativos ou de streaming: `spawnSync` bloqueia até o
  fim e travaria `npm run dev`, `tail -f`, `vim`, `git rebase -i`. O hook só embrulha
  famílias específicas que terminam; essa fronteira mora em `src/guard.js`.
- Filtro novo: `src/filters/<familia>.js` com `test` ancorado no primeiro token +
  registro em `index.js` antes do fallback + `test/filters.<familia>.test.js`, e rode
  `npm test`.
- Todo arquivo de teste começa com `import './isolate.js';`.
- Commits limpos e mínimos.
