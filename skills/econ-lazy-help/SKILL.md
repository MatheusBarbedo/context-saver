---
name: econ-lazy-help
description: >
  Cartão de referência rápida de todos os níveis, skills e comandos do modo
  econômico de código. Exibição única, não é um modo persistente. Gatilho:
  /econ-lazy-help, "ajuda do modo econômico", "quais comandos do modo econômico",
  "como uso o modo econômico".
---

# Ajuda do modo econômico

Mostre esse cartão quando invocado. Exibição única, NÃO muda de modo, não escreve
flag, não persiste nada.

## Níveis

| Nível | Gatilho | O que muda |
|-------|---------|-------------|
| **Lite** | `/lazy lite` | Constrói o que foi pedido, nomeia a alternativa preguiçosa em uma linha. |
| **Full** | `/lazy` | Escada enforced: YAGNI → stdlib → nativo → uma linha → mínimo. Padrão. |
| **Ultra** | `/lazy ultra` | Extremista de YAGNI. Deleção antes de adição. Questiona o requisito antes de construir. |

Nível persiste até mudar ou até o fim da sessão.

## Skills

| Skill | Gatilho | O que faz |
|-------|---------|--------------|
| **econ-lazy** | `/lazy` | O modo econômico em si. Solução mais simples que funciona. |
| **econ-lazy-review** | `/econ-lazy-review` | Revisão de over-engineering: `L42: yagni: factory, um produto. Inline.` |
| **econ-lazy-audit** | `/econ-lazy-audit` | Auditoria de over-engineering no repo inteiro: lista ranqueada do que deletar. |
| **econ-lazy-debt** | `/econ-lazy-debt` | Roda `econ.js lazy debt` e apresenta o ledger de atalhos marcados. |
| **econ-lazy-gain** | `/econ-lazy-gain` | Placar de impacto medido (fonte: benchmarks do Ponytail). |
| **econ-lazy-help** | `/econ-lazy-help` | Esse cartão. |

## Desativar

Diga "stop lazy" ou "modo normal". Retome quando quiser com `/lazy`. `/lazy off`
também funciona.

## Configurar nível padrão

Padrão = `full`, ativa sozinho toda sessão. Pra mudar:

**Variável de ambiente** (prioridade mais alta):
```bash
export ECON_LAZY_MODE=ultra
```

**Persistido** (`~/.context-saver/lazy-state-<agente>.json`, campo `defaultMode`):
```bash
node econ.js lazy default lite
```

Coloque `off` pra desativar a ativação automática no início da sessão; ligue na
mão com `/lazy` quando quiser.

Resolução: variável de ambiente > `defaultMode` persistido > `full`.

## Mais

Instalação e comandos: `node econ.js lazy install`, `node econ.js lazy status`,
`node econ.js lazy uninstall`. Conceito adaptado de
https://github.com/dietrichgebert/ponytail (MIT).
