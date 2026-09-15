---
name: econ-lazy-debt
description: >
  Coleta todo comentário `econ:` do repositório num ledger de dívida, pra que os
  atalhos deliberados que o modo econômico deixa não apodreçam em "depois vira
  nunca". Use quando o usuário disser "dívida do modo econômico", "econ-lazy-debt",
  "o que o modo econômico adiou", "lista os atalhos", "ledger econ", ou "o que
  marcamos pra depois". Relatório único, não muda nada.
---

Todo atalho deliberado do modo econômico é marcado com um comentário `econ:`
nomeando o teto e o caminho de upgrade. Essa skill junta tudo isso num ledger pra
que um adiamento não vire permanente em silêncio.

## Como coletar

Rode o scanner determinístico já embutido no context-saver em vez de fazer o grep
na mão:

```
node econ.js lazy debt
```

Ele já ignora `node_modules`, `.git`, `dist`, `build` e já separa limite e gatilho.

## Saída

Apresente a saída do comando como está: uma linha por marcador, com o limite e o
gatilho extraídos, e `[sem gatilho]` nos que não têm gatilho reconhecível — esses
são os que apodrecem em silêncio.

Quer persistir? Pergunte ao usuário e escreva o ledger num arquivo (ex:
`ECON-LAZY-DEBT.md`) com a mesma saída. Relatório único. "stop econ-lazy-debt" ou
"modo normal" pra reverter.

## Fronteiras

Só lê e relata via `econ.js lazy debt`, não muda nada por conta própria.
