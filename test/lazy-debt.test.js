import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanDebt, formatDebtReport } from '../src/lazy/debt.js';

function makeProject() {
  const dir = mkdtempSync(join(tmpdir(), 'econ-lazy-debt-'));
  writeFileSync(
    join(dir, 'a.js'),
    '// econ: lock global, trocar por lock por conta se o throughput crescer\nfunction f() {}\n',
    'utf8',
  );
  writeFileSync(join(dir, 'b.py'), '# econ: scan O(n^2)\n', 'utf8');
  mkdirSync(join(dir, 'node_modules'), { recursive: true });
  writeFileSync(join(dir, 'node_modules', 'ignored.js'), '// econ: nao deve aparecer\n', 'utf8');
  return dir;
}

test('scanDebt encontra marcador com gatilho', () => {
  const dir = makeProject();
  const findings = scanDebt(dir);
  const a = findings.find((f) => f.file.endsWith('a.js'));
  assert.equal(a.ceiling, 'lock global');
  assert.equal(a.trigger, 'trocar por lock por conta se o throughput crescer');
});

test('scanDebt marca ausência de gatilho quando não há vírgula', () => {
  const dir = makeProject();
  const findings = scanDebt(dir);
  const b = findings.find((f) => f.file.endsWith('b.py'));
  assert.equal(b.trigger, null);
});

test('scanDebt ignora node_modules', () => {
  const dir = makeProject();
  const findings = scanDebt(dir);
  assert.ok(!findings.some((f) => f.file.includes('node_modules')));
});

test('formatDebtReport lista marcador, conta total e sem gatilho', () => {
  const dir = makeProject();
  const report = formatDebtReport(scanDebt(dir), dir);
  assert.ok(report.includes('a.js:1'));
  assert.ok(report.includes('[sem gatilho]'));
  assert.ok(report.includes('2 marcador(es), 1 sem gatilho.'));
});

test('formatDebtReport sem achados', () => {
  const dir = mkdtempSync(join(tmpdir(), 'econ-lazy-debt-empty-'));
  assert.equal(formatDebtReport(scanDebt(dir), dir), 'Nenhuma dívida econ: encontrada.');
});
