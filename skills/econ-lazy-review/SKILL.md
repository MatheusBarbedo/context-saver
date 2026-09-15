---
name: econ-lazy-review
description: >
  Revisão de código focada exclusivamente em over-engineering. Encontra o que
  cortar: stdlib reinventada, dependência desnecessária, abstração especulativa,
  flexibilidade morta. Uma linha por achado: local, o que cortar, o que substitui.
  Use quando o usuário disser "revisa over-engineering", "o que dá pra deletar",
  "isso está over-engineered", "revisão de simplificação", ou invocar
  /econ-lazy-review. Complementa revisão de corretude, essa só caça complexidade.
---

Revise o diff atrás de complexidade desnecessária. Uma linha por achado: local, o
que cortar, o que substitui. O melhor resultado do diff é ficar mais curto.

## Formato

`L<linha>: <tag> <o quê>. <substituto>.`, ou `<arquivo>:L<linha>: ...` pra diff
com múltiplos arquivos.

Tags:

- `delete:` código morto, flexibilidade sem uso, feature especulativa. Substituto: nada.
- `stdlib:` coisa feita à mão que a stdlib já entrega. Nomeie a função.
- `native:` dependência ou código fazendo o que a plataforma já faz. Nomeie o recurso.
- `yagni:` abstração com uma implementação, config que ninguém configura, camada com um chamador.
- `shrink:` mesma lógica, menos linhas. Mostre a forma mais curta.

## Exemplos

❌ "Essa classe EmailValidator pode ser mais complexa que o necessário, você já
considerou se todas essas regras de validação são precisas nessa fase?"

✅ `L12-38: stdlib: validador de 27 linhas. "@" no email, 1 linha, validação de
verdade é o e-mail de confirmação.`

✅ `L4: native: moment.js importado pra uma chamada de formatação.
Intl.DateTimeFormat, 0 deps.`

✅ `repo.py:L88: yagni: AbstractRepository com uma implementação. Inline até
existir uma segunda.`

✅ `L52-71: delete: wrapper de retry em volta de chamada local idempotente. Nada
substitui.`

✅ `L30-44: shrink: loop manual monta dict. dict(zip(keys, values)), 1 linha.`

## Pontuação

Termine com a única métrica que importa: `net: -<N> linhas possíveis.`

Se não há nada pra cortar: `Já enxuto. Manda.` e pare.

## Fronteiras

Escopo: só over-engineering e complexidade. Bug de corretude, falha de segurança e
performance ficam explicitamente fora — mande pra uma revisão normal, não essa. Um
smoke test único ou self-check com `assert` é o mínimo do modo econômico, não é
bloat, nunca marque isso pra deletar. Não aplica os fixes, só lista.
"stop econ-lazy-review" ou "modo normal": volta pro estilo de revisão verboso.
