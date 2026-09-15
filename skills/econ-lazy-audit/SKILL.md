---
name: econ-lazy-audit
description: >
  Auditoria do repo inteiro atrás de over-engineering. Como o econ-lazy-review,
  mas varre a árvore inteira em vez de um diff: lista ranqueada do que deletar,
  simplificar ou trocar por stdlib/nativo. Use quando o usuário disser "audita
  esse repo", "audita over-engineering", "o que dá pra deletar desse repo",
  "acha bloat", "econ-lazy-audit". Relatório único, não aplica fix.
---

econ-lazy-review, só que no repo inteiro. Varra a árvore toda em vez de um diff.
Ranqueie achados do maior corte pro menor.

## Tags

Mesmas do econ-lazy-review:

- `delete:` código morto, flexibilidade sem uso, feature especulativa. Substituto: nada.
- `stdlib:` coisa feita à mão que a stdlib já entrega. Nomeie a função.
- `native:` dependência ou código fazendo o que a plataforma já faz. Nomeie o recurso.
- `yagni:` abstração com uma implementação, config que ninguém configura, camada com um chamador.
- `shrink:` mesma lógica, menos linhas. Mostre a forma mais curta.

## Caça

Dependência que a stdlib ou a plataforma já entrega, interface com uma
implementação, factory pra um produto, wrapper que só delega, arquivo que exporta
uma coisa só, flag e config morta, stdlib feita à mão.

## Saída

Uma linha por achado, ranqueada: `<tag> <o que cortar>. <substituto>. [caminho]`.
Termine com `net: -<N> linhas, -<M> deps possíveis.` Nada pra cortar: `Já enxuto. Manda.`

## Fronteiras

Escopo: só over-engineering e complexidade. Bug de corretude, falha de segurança e
performance ficam fora, mande pra revisão normal. Lista achados, não aplica nada.
Relatório único. "stop econ-lazy-audit" ou "modo normal" pra reverter.
