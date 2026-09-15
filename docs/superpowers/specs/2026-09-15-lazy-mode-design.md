# `econ.js lazy` — escada de decisão de código mínimo

## Contexto

O [Ponytail](https://github.com/dietrichgebert/ponytail) (MIT, dietrichgebert/ponytail)
é uma skill/conjunto de instruções que muda como o agente **escreve** código: impõe
uma escada de decisão (existe necessidade real? já existe no projeto? stdlib? nativo?
dependência já instalada? uma linha? só então código mínimo) antes de qualquer geração
de código. Cobre 20+ plataformas via hooks, estado de sessão (modos lite/full/ultra),
statusline e um MCP próprio.

O context-saver hoje resolve um problema diferente e mais estreito: comprime a
**saída** de comandos verbosos via hook `PreToolUse`, para Claude Code/Copilot/Codex
CLI. Este spec porta o **conceito central** do Ponytail (a escada de decisão + a
dívida rastreável de atalhos deliberados) para dentro do context-saver, adaptado à
arquitetura e às convenções que já existem no projeto — não um fork literal do
repositório nem uma cópia de arquivos.

## Decisões já tomadas

- **Forma de entrega**: instrução estática nos arquivos que cada agente já lê sozinho
  (`CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md`), não hooks com estado.
  Reaproveita o padrão que `doctor.js` já usa para esses arquivos (por projeto, não
  global), em vez do padrão global de `installer.js`.
- **Sem níveis lite/full/ultra**: exigiriam estado/toggle em runtime que o econ.js não
  tem hoje. Fica só o modo "full" do Ponytail (a escada enforced).
- **Marcador de dívida**: comentário `econ: <limite>, <quando revisitar>` para atalhos
  deliberados — única exceção à regra "zero comentários" do projeto, porque é registro
  de dívida rastreável, não explicação de código.
- **Fora de escopo nesta v1**: revisão de over-engineering (`ponytail-review`/`audit`,
  dependem de julgamento do agente sobre um diff, não são portáveis para código
  determinístico), placar de marketing (`ponytail-gain`), MCP próprio, e as 17+
  plataformas que o context-saver não suporta.

## Comandos novos

### `econ.js lazy install [claude|copilot|codex]`

Escreve um bloco marcado e idempotente no arquivo de instrução do projeto atual
(`cwd`, igual ao `doctor.js`):

| Agente  | Arquivo                              |
|---------|---------------------------------------|
| claude  | `CLAUDE.md`                           |
| codex   | `AGENTS.md`                           |
| copilot | `.github/copilot-instructions.md`     |

Sem argumento, escreve nos três (cria o arquivo se não existir, igual ao
`applyFix` do doctor para `copilot-instructions.md`; para `CLAUDE.md`/`AGENTS.md`
ausentes, cria só com o bloco).

O bloco é delimitado por `<!-- econ:lazy:start -->` / `<!-- econ:lazy:end -->`.
Rodar `install` de novo substitui o conteúdo entre os marcadores em vez de duplicar
(mesma idempotência do hook de `installer.js`).

Conteúdo do bloco (a escada, em português, condensada):

```markdown
<!-- econ:lazy:start -->
## Modo econômico de código

Antes de escrever código, pare no primeiro degrau que resolve:

1. Isso precisa existir? Necessidade especulativa: não construa, diga em uma linha.
2. Já existe no projeto? Reaproveite o helper/util/padrão que já está aqui.
3. A stdlib resolve? Use.
4. Um recurso nativo da plataforma resolve? Use.
5. Uma dependência já instalada resolve? Use, não adicione uma nova.
6. Cabe em uma linha? Faça em uma linha.
7. Só então: o mínimo de código que funciona.

A escada roda depois de entender o problema, não no lugar disso: leia a tarefa e o
código que ela toca, rastreie o fluxo real, só depois suba a escada.

Bug = causa raiz, não sintoma: encontre todos os chamadores da função antes de
corrigir; um guard na função compartilhada é um diff menor que um guard por
chamador, e corrigir só o caminho que o ticket cita deixa um chamador irmão
quebrado.

Regras: sem abstração não pedida, sem dependência nova evitável, sem boilerplate
não pedido, deleção antes de adição, menos arquivos possível. Diff mais curto
vence, mas só depois de entender o problema — o menor diff no lugar errado não é
economia, é um segundo bug.

Nunca economize em: validação de entrada em fronteira de confiança, tratamento de
erro que evita perda de dado, segurança, acessibilidade, o que foi pedido
explicitamente.

Atalho deliberado que corta uma esquina real (lock global, scan O(n²), heurística
ingênua) leva um comentário `econ: <limite>, <quando revisitar>` — única exceção à
regra de zero comentários deste projeto. Rode `econ.js lazy debt` para listar todos.
<!-- econ:lazy:end -->
```

### `econ.js lazy uninstall [claude|copilot|codex]`

Remove o bloco marcado do(s) arquivo(s) do projeto atual. Sem argumento, remove dos
três. Não apaga o arquivo nem o resto do conteúdo.

### `econ.js lazy status`

Reporta, para o projeto atual, se o bloco está presente em cada um dos três arquivos
(presente / ausente / arquivo inexistente).

### `econ.js lazy debt`

Varre o projeto atual (respeitando `.gitignore`/pastas óbvias como `node_modules`,
`.git`, `dist`, `build`) atrás do padrão `econ: <texto>` em comentários de linha
(`//`, `#`, e outros prefixos comuns). Para cada ocorrência, extrai limite e gatilho
de upgrade (texto livre após a vírgula) e lista `arquivo:linha — <limite> — <gatilho>`,
sinalizando com `[sem gatilho]` quando não há vírgula/gatilho reconhecível. Termina
com contagem total e quantos estão sem gatilho. Sem ocorrências: mensagem única de
"nenhuma dívida encontrada".

100% determinístico (grep + parsing de texto), sem depender de julgamento do
agente — por isso é o único pedaço do conceito original de skills (`ponytail-debt`)
que vira código de verdade em vez de instrução.

## Arquitetura

- `src/lazy.js` — novo módulo: `buildBlock()`, `installLazy(agent, cwd)`,
  `uninstallLazy(agent, cwd)`, `statusLazy(cwd)`, `scanDebt(cwd)`. Segue o estilo de
  `doctor.js` (funções puras que recebem `cwd`, sem estado global).
- `econ.js` — novo subcomando `lazy` que despacha para `install|uninstall|status|debt`,
  igual ao despacho existente dos outros subcomandos.
- Sem novas dependências, sem novo estado em `~/.context-saver/`.

## Testes

- `test/lazy.test.js` — install/uninstall idempotente nos três arquivos (criar,
  substituir bloco existente, preservar conteúdo fora dos marcadores, remover só o
  bloco), e `status` refletindo os três estados possíveis por arquivo.
- `test/lazy-debt.test.js` — scan encontrando marcador com e sem gatilho, ignorando
  `node_modules`/`.git`, contagem final, caso sem ocorrências.

## Fora de escopo

Modos lite/full/ultra, toggle em runtime, statusline, hook de ativação por sessão,
skills de revisão/auditoria de over-engineering, MCP, suporte a outras plataformas
além de Claude Code/Copilot/Codex CLI.
