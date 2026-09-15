---
name: econ-lazy-gain
description: >
  Mostra o impacto medido do modo econômico de código como um placar compacto:
  menos código, menos custo, mais velocidade — citando os benchmarks publicados
  do projeto Ponytail, de onde esse conceito foi adaptado. Exibição única, não é
  um modo persistente, e não é um número por repositório. Gatilho:
  /econ-lazy-gain, "placar do modo econômico", "o que o modo econômico economiza".
---

# Placar do modo econômico

Mostre esse placar quando invocado. Exibição única: NÃO muda de modo, não escreve
flag, não persiste nada.

Os números são medianas de benchmark **publicadas pelo projeto Ponytail**
(https://github.com/dietrichgebert/ponytail), de onde a escada de decisão deste
modo foi adaptada — 5 tarefas do dia a dia (validador de e-mail, debounce, soma de
CSV, timer de contagem regressiva, rate limiter), 3 modelos (Haiku, Sonnet, Opus).
Não são medidas do context-saver nem de um repositório específico.

## Placar

Renderize barras ASCII simples. O comprimento da barra mostra o intervalo medido; o
rótulo carrega o número exato:

```
  ganho do modo econômico          mediana do benchmark do Ponytail · 5 tarefas · 3 modelos

  Linhas de código   sem skill  ████████████████████  100%
                      lazy      ██▌·················    6–20%   ▼ 80–94%
  Custo              sem skill  ████████████████████  100%
                      lazy      █████▌··············   23–53%  ▼ 47–77%
  Velocidade          lazy      ▸ 3–6× mais rápido

  Neste repo:  econ.js lazy debt  (atalhos que você adiou)
```

## Limite de honestidade

Esses números são medianas de benchmark de outro projeto, não deste repositório.
NUNCA imprima um número de economia por repositório ("você economizou X linhas
aqui"): a versão não construída nunca foi escrita, então não existe uma linha de
base real pra subtrair num repo ao vivo. O único número real por repositório vem
de `econ.js lazy debt` (um ledger contado), e esse placar aponta pra lá em vez de
inventar um.

## Fronteiras

Exibição única. Não edita nada, não muda modo. "stop lazy" ou "modo normal": reverte.
