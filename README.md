# context-saver

Economizador de tokens para **Claude Code** e **GitHub Copilot** no VSCode.
Configura uma vez e a saída de comandos verbosos (`git status`, `npm test`, `tsc`,
`docker build`, `curl -v`, `grep -r`…) chega comprimida ao agente — automaticamente.
Node.js puro, **zero dependências**, **sem `npm install`**.

## Instalar (uma vez por ferramenta)

```powershell
node econ.js install claude     # injeta hook em ~/.claude/settings.json
node econ.js install copilot    # injeta hook em ~/.copilot/hooks/
```

Reinicie o chat do agente. A economia passa a valer sozinha.

## Ligar / desligar

```powershell
node econ.js on       # religa
node econ.js off      # pausa (sem desinstalar)
node econ.js status   # mostra o que está instalado e se está ativo
```

## Provar a economia

```powershell
node econ.js stats
```

Mostra quantos comandos foram medidos e a economia de tokens (antes → depois),
total e por família. Os dados ficam em `~/.context-saver/metrics.jsonl`.

## Recuperar o que foi cortado

Quando um resumo esconde linhas, ele imprime um id de recuperação:

```
… +120 linhas ocultas — recupere com: econ show <id> [--lines A-B] [--grep X]
```

```powershell
node econ.js show <id>                 # tudo
node econ.js show <id> --lines 40-80   # só um intervalo
node econ.js show <id> --grep error    # só as linhas que casam
```

Assim o agente puxa apenas o trecho que precisa, em vez de reler a saída inteira.

## Auditar o setup

```powershell
node econ.js doctor         # audita (só reporta)
node econ.js doctor --fix   # cria .claudeignore e .github/copilot-instructions.md ausentes
```

Checa boas práticas que dão o maior retorno de economia: `CLAUDE.md` e
`.github/copilot-instructions.md` (equivalente do CLAUDE.md para o Copilot)
presentes e no tamanho certo, `.gitignore`/`.claudeignore`, e número de MCPs
conectados. `doctor` sem flag só reporta; `--fix` cria os arquivos de ignore/
instrução que faltarem.

## Como funciona

O hook `PreToolUse` reescreve comandos-alvo para `node econ.js run --b64 <cmd>`.
O runner executa o comando real, aplica um filtro que corta o ruído, salva a saída
completa num arquivo temporário (recuperável com `econ show`), registra a métrica de
economia e devolve só o resumo — preservando o código de saída real. Comandos sem
filtro caem no filtro genérico (cabeça + cauda) quando a saída é longa.

## Famílias otimizadas

`git status/diff/log`, testes (`jest/pytest/go test/cargo test`), lint/build
(`tsc/eslint/ruff`), install (`npm/pnpm/pip`), listagem (`ls/dir/tree`),
`docker`, `curl/wget`, `grep/rg/find`, bundlers (`vite/webpack/next build`) e um
filtro **genérico** para qualquer outra saída longa.

## Adicionar um filtro novo

1. Crie `src/filters/<familia>.js` exportando um array de filtros no formato
   `{ name, test(command), run({command, stdout, stderr, exitCode}) }`
   (retorne `null` quando não souber comprimir com segurança).
2. Registre em `src/filters/index.js` (`ALL_FILTERS`) — antes de `genericFilters`.
3. Escreva `test/filters.<familia>.test.js` e rode `node --test`.

## Testes

```powershell
node --test
```

## Notas

- **Copilot hooks são preview**; o schema pode variar entre versões. O adaptador lê
  o comando de `toolArgs.command` e o installer registra o matcher
  `bash|powershell|run_in_terminal`.
- Os comandos reescritos usam `permissionDecision: "allow"` (rodam sem o prompt
  normal). Para exigir prompt, troque para `"ask"` em `src/hook-adapter.js`.
- O runner reexecuta o comando no mesmo shell que o agente usou (detectado pelo
  hook). Se o bash não estiver no PATH, procura no Git Bash padrão; dá pra forçar
  um shell com a variável `ECON_SHELL`.
- `doctor` recomenda hábitos de sessão (`/compact`, `/clear`, escolha de modelo,
  subagents), mas não os executa — são ações suas no agente.
