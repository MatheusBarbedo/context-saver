import './isolate.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stripFrontmatter, filterByMode, buildLazyInstructions } from '../src/lazy/instructions.js';

const FIXTURE = `---
name: fixture
---

# Regra geral

Sempre entenda o problema antes de codar.

## Intensidade

| Nível | O que muda |
|-------|------------|
| **lite** | linha do lite |
| **full** | linha do full |
| **ultra** | linha do ultra |

Exemplo:
- lite: "resposta lite"
- full: "resposta full"
- ultra: "resposta ultra"

## Regra sem nível

- Full disclosure não é sobre o modo full, é uma frase comum, deve sobreviver sempre.
`;

test('stripFrontmatter remove só o bloco YAML', () => {
  const out = stripFrontmatter(FIXTURE);
  assert.ok(!out.includes('name: fixture'));
  assert.ok(out.includes('# Regra geral'));
});

test('filterByMode mantém regra comum e só a linha/exemplo do nível pedido', () => {
  const out = filterByMode(stripFrontmatter(FIXTURE), 'ultra');
  assert.ok(out.includes('Sempre entenda o problema'));
  assert.ok(out.includes('linha do ultra'));
  assert.ok(!out.includes('linha do lite'));
  assert.ok(!out.includes('linha do full'));
  assert.ok(out.includes('resposta ultra'));
  assert.ok(!out.includes('resposta lite'));
});

test('filterByMode não remove bullet que só começa com uma palavra de nível', () => {
  const out = filterByMode(stripFrontmatter(FIXTURE), 'lite');
  assert.ok(out.includes('Full disclosure não é sobre o modo full'));
});

test('filterByMode cai pra full quando o nível é inválido', () => {
  const out = filterByMode(stripFrontmatter(FIXTURE), 'bogus');
  assert.ok(out.includes('linha do full'));
});

test('buildLazyInstructions lê o arquivo e prefixa o cabeçalho do nível', () => {
  const dir = mkdtempSync(join(tmpdir(), 'econ-lazy-skill-'));
  const skillPath = join(dir, 'SKILL.md');
  writeFileSync(skillPath, FIXTURE, 'utf8');
  const out = buildLazyInstructions('full', { skillPath });
  assert.ok(out.startsWith('MODO ECONÔMICO ATIVO — nível: full'));
  assert.ok(out.includes('linha do full'));
});
