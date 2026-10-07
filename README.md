# context-saver

Economizador de tokens para **Claude Code**, **GitHub Copilot** e **Codex CLI**.
Configura uma vez e a saída de comandos verbosos (`git status`, `npm test`, `tsc`,
`docker build`, `curl -v`, `grep -r`...) chega comprimida ao agente, automaticamente.
Node.js puro, **zero dependências**, **sem `npm install`**.

O hook mora na configuração global de cada agente (`~/.claude`, `~/.copilot`,
`~/.codex`). Funciona igual rodando o agente
pelo terminal puro, por SSH ou de dentro do VSCode, já que todos esses lugares
chamam o mesmo binário do agente por baixo.

## Comandos

### `node econ.js install [claude|copilot|codex]`

Injeta o hook `PreToolUse` que ativa a economia. O comando registrado já leva
`--agent <claude|copilot|codex>`, então as métricas em `stats` sempre sabem
quem chamou, sem depender de adivinhar pelo formato do JSON.

```powershell
node econ.js install claude     # injeta hook em ~/.claude/settings.json
node econ.js install copilot    # injeta hook em ~/.copilot/hooks/
node econ.js install codex      # injeta hook em ~/.codex/hooks.json
```

Sem argumento, instala nos três. É idempotente: rodar de novo substitui o hook
antigo pelo atual em vez de duplicar (útil depois de atualizar o context-saver:
rode `install` de novo pra pegar o comando de hook mais recente). Reinicie o
chat do agente depois de instalar.

### `node econ.js uninstall [claude|copilot|codex] [--purge]`

Remove o hook instalado, sem apagar o restante da configuração do agente.

```powershell
node econ.js uninstall claude    # tira o hook de ~/.claude/settings.json
node econ.js uninstall copilot   # apaga ~/.copilot/hooks/context-saver.json
node econ.js uninstall codex     # tira o hook de ~/.codex/hooks.json
node econ.js uninstall --purge   # remove os tres hooks e zera o historico
```

Sem argumento, desinstala dos três. A flag `--purge` também apaga
`~/.context-saver/` (métricas, estado ligado/desligado e saídas guardadas), como um recomeço do zero.
Sem `--purge`, o histórico de métricas continua intacto mesmo desinstalado.

### `node econ.js on` / `node econ.js off`

Liga ou pausa a economia sem desinstalar o hook. Útil para testar um comando
com a saída crua sem precisar reinstalar depois.

### `node econ.js status`

Mostra se está ligado e se o hook de cada agente está instalado (e onde).

### `node econ.js stats`

```powershell
node econ.js stats
```

Mostra quantos comandos foram medidos, a economia de tokens (antes -> depois)
total, por família de filtro e por agente (`claude`/`copilot`/`codex`/`unknown`,
sendo `unknown` os registros antigos, de antes de existir essa separação, ou de
um hook instalado antes da última atualização). Os dados ficam em
`~/.context-saver/metrics.jsonl` (ou em `$ECON_HOME/metrics.jsonl`, se definido).

### `node econ.js show <id> [--lines A-B] [--grep X]`

Quando um resumo esconde linhas, ele informa o caminho absoluto da saída completa:

```
… +120 linhas ocultas. Saída completa: /home/voce/.context-saver/tee/<id>.log (leia só o trecho necessário)
```

O agente lê direto do arquivo só o trecho de que precisa, sem depender de `econ`
no PATH. O `show` continua disponível para consulta manual pelo id (o nome do
arquivo sem `.log`):

```powershell
node econ.js show <id>                 # tudo
node econ.js show <id> --lines 40-80   # só um intervalo
node econ.js show <id> --grep error    # só as linhas que casam
```

Os arquivos ficam em `~/.context-saver/tee/`, com permissão só do dono (0700 na
pasta, 0600 nos arquivos), e são apagados depois de 24h.

### `node econ.js doctor [--fix]`

```powershell
node econ.js doctor         # audita (só reporta)
node econ.js doctor --fix   # cria .claudeignore e .github/copilot-instructions.md ausentes
```

Checa boas práticas que dão o maior retorno de economia: `CLAUDE.md` e
`.github/copilot-instructions.md` (equivalente do CLAUDE.md para o Copilot)
presentes e no tamanho certo, `.gitignore`/`.claudeignore`, e número de MCPs
conectados. `doctor` sem flag só reporta; `--fix` cria os arquivos de ignore/
instrução que faltarem.

### `node econ.js hook --agent <claude|copilot|codex>` e `node econ.js run --b64 <cmd>`

Uso interno, chamados automaticamente pelo agente depois do `install`, não
precisam ser digitados na mão. `hook` recebe o payload do `PreToolUse` e decide
se reescreve o comando; `run` executa o comando real, comprime a saída e
devolve o resultado preservando o código de saída.

## Como funciona

O hook `PreToolUse` reescreve comandos-alvo para
`node econ.js run --agent <claude|copilot|codex> --b64 <cmd>`. O runner executa
o comando real, aplica um filtro que corta o ruído, salva a saída completa em
`~/.context-saver/tee/` (o resumo informa o caminho), registra a métrica de
economia (por família e por agente) e devolve só o resumo, preservando o
código de saída real. Quando o filtro da família não sabe comprimir, o filtro
genérico (cabeça + cauda) entra se a saída for longa.

O hook só reescreve quando todas as regras abaixo valem (`src/guard.js`). Fora
disso o comando roda cru, pelo fluxo normal de permissão do agente.

- Comando simples: sem `&&`, `||`, `;`, `|`, `&`, `$(`, crase, parênteses ou
  redirecionamento. Operadores entre aspas não contam.
- A família reconhecida está no primeiro token (`npx` opcional na frente).
- Não é `find` com `-delete`, `-exec`, `-execdir`, `-ok`, `-okdir`, `-fprint`,
  `-fprint0`, `-fprintf` ou `-fls`.
- Não pediu `run_in_background`.
- Não fica em execução contínua: `--watch`/`--watchAll` (exceto `=false`), `-w`
  em `tsc`/`webpack`/`rollup`/`vite`, `webpack serve`, `esbuild --serve`,
  `docker compose up` sem `-d`/`--detach`/`--wait`, `docker compose logs -f`,
  `watch`, `events`, `attach`, `stats` sem `--no-stream`, e scripts com `watch`
  no nome. Para `npm`/`pnpm`/`yarn`, o script é lido do `package.json` do
  diretório da sessão (inclusive scripts encadeados): `ng test` sem
  `--watch=false`, `karma start` sem `--single-run`, `ng serve`, `vite` sem
  `build`, `next dev`, `nuxt dev` e `nodemon` também ficam de fora.

Ao reescrever, o hook mantém os demais argumentos da ferramenta (`timeout`,
`description`, `run_in_background` etc.) e só troca o `command`.

O Codex CLI usa o mesmo protocolo de hook do Claude Code (payload com
`tool_input.command`, saída com `hookSpecificOutput.updatedInput`), então o
adaptador trata os dois do mesmo jeito, distinguindo qual é qual só pelo
`--agent` que o installer grava no comando do hook.

## Famílias otimizadas

`git status/diff/log`, testes (`jest/pytest/go test/cargo test`), lint/build
(`tsc/eslint/ruff`), install (`npm/pnpm/pip`), listagem (`ls/dir/tree`),
`docker`, `curl/wget`, `grep/rg/find`, bundlers (`vite/webpack/next build`) e um
filtro **genérico** para qualquer outra saída longa.

## Adicionar um filtro novo

1. Crie `src/filters/<familia>.js` exportando um array de filtros no formato
   `{ name, test(command), run({command, stdout, stderr, exitCode}) }`
   (retorne `null` quando não souber comprimir com segurança). O `test` deve
   casar só no início do comando (`^\s*`).
2. Registre em `src/filters/index.js` (`ALL_FILTERS`), antes de `genericFilters`.
3. Escreva `test/filters.<familia>.test.js` começando com `import './isolate.js';`
   e rode `npm test`.

## Modo econômico de código (`econ.js lazy`)

Além de comprimir saída de comando, o context-saver também injeta uma escada de
decisão de código mínimo — conceito adaptado do
[Ponytail](https://github.com/dietrichgebert/ponytail) (MIT) — direto no agente via
hooks `SessionStart`/`UserPromptSubmit`/`SubagentStart`, com níveis `lite`/`full`
(padrão)/`ultra`.

```powershell
node econ.js lazy install [claude|copilot|codex]   # ativa a escada (hooks + skills + statusline no claude)
node econ.js lazy uninstall [claude|copilot|codex] [--purge]
node econ.js lazy status                           # o que está instalado, por agente
node econ.js lazy default <off|lite|full|ultra>    # nível padrão de toda sessão nova
node econ.js lazy debt                             # lista os atalhos marcados com `econ: <limite>, <gatilho>`
```

Durante a sessão, troque de nível com `/lazy lite|full|ultra|off` ou desative com
"stop lazy"/"modo normal" — sticky até você mudar de novo ou a sessão acabar. O
Claude Code também ganha 5 skills extras (`econ-lazy-review`, `econ-lazy-audit`,
`econ-lazy-debt`, `econ-lazy-gain`, `econ-lazy-help`) e uma statusline `[LAZY]`/
`[LAZY:ULTRA]`. O Copilot só recebe a escada no início da sessão (sem troca de nível
em runtime nem propagação pra subagente) — mesmo limite que o Ponytail original tem
nessa plataforma.

## Testes

```powershell
npm test
```

Roda `node --test test/*.test.js`. Cada arquivo de teste importa
`test/isolate.js`, que aponta o `ECON_HOME` para uma pasta temporária: os testes
não tocam no `~/.context-saver` real.

## Notas

- **Copilot hooks são preview**; o schema pode variar entre versões. O adaptador lê
  o comando de `toolArgs.command` e o installer registra o matcher
  `bash|powershell|run_in_terminal`.
- Os comandos reescritos usam `permissionDecision: "allow"` (rodam sem o prompt
  normal), por isso o hook só reescreve o que passa nas regras de
  "Como funciona". Para exigir prompt, troque para `"ask"` em `src/hook-adapter.js`.
- `ECON_HOME` muda o diretório de estado (métricas, liga/desliga, tee e modo
  lazy). O padrão é `~/.context-saver`.
- O runner reexecuta o comando no mesmo shell que o agente usou (detectado pelo
  hook). Se o bash não estiver no PATH, procura no Git Bash padrão; dá pra forçar
  um shell com a variável `ECON_SHELL`.
- `doctor` recomenda hábitos de sessão (`/compact`, `/clear`, escolha de modelo,
  subagents), mas não os executa, são ações suas no agente.
- **Codex CLI hooks também são recentes** e o schema pode mudar entre versões.
  O `hooks.json` do Codex é compartilhado com outros hooks que você já tenha;
  o install/uninstall só mexe na entrada do context-saver, preservando o resto.
