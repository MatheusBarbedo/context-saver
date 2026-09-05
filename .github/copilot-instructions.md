# Instruções do projeto — context-saver

Economizador de tokens para Claude Code e GitHub Copilot. Um hook `PreToolUse`
intercepta comandos de terminal verbosos, reescreve para `econ.js run`, executa o
comando real, comprime a saída com um filtro e devolve só o resumo ao agente,
preservando o exit code. Node.js puro, ESM, zero dependências, sem `npm install`.

## Como rodar

- Testes: `node --test`.
- CLI: `node econ.js <install [claude|copilot] | on | off | status | stats | show <id> | doctor [--fix] | hook | run <cmd>>`.

## Estrutura

- `econ.js` despacha os subcomandos.
- `src/hook-adapter.js` decide se reescreve o comando; só reescreve famílias que
  casam um filtro específico, detecta o shell e faz anti-loop com `econ.js`.
- `src/runner.js` reexecuta via `spawnSync`, aplica o filtro específico e, se falhar,
  o filtro genérico como fallback; grava a métrica.
- `src/filters/*.js`: cada família exporta `{ name, test, run }` e retorna `null`
  quando não deve comprimir. `src/filters/index.js` ordena do mais específico ao
  menos. O `generic` é fallback só no runner, fora de `ALL_FILTERS`.
- `src/tee.js`/`src/show.js` guardam e recuperam a saída completa por id.
- `src/metrics.js`/`src/tokens.js` fazem telemetria em `~/.context-saver/metrics.jsonl`.
- `src/doctor.js`, `src/state.js`, `src/installer.js` cuidam de auditoria, estado e
  instalação de hooks.

## Regras ao contribuir

- Zero comentários no código; zero dependências (só APIs nativas do Node).
- Nunca embrulhe comandos interativos ou de streaming: `spawnSync` bloqueia até o
  fim e travaria `npm run dev`, `tail -f`, `vim`, `git rebase -i`. O hook só embrulha
  famílias específicas que terminam.
- Filtro novo: `src/filters/<familia>.js` + registro em `index.js` antes do fallback
  + `test/filters.<familia>.test.js`, e rode `node --test`.
- Commits limpos e mínimos.
