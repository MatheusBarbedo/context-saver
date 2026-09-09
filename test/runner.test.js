import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runAndCompress, shellCandidates } from '../src/runner.js';

function metricsFile() {
  return join(mkdtempSync(join(tmpdir(), 'econ-r-')), 'metrics.jsonl');
}

function fakeExec(result) {
  return () => result;
}

test('comando com filtro tem saída comprimida', () => {
  const raw = ['On branch main', '  (use "git add" ...)', '\tmodified: a.js'].join('\n');
  const r = runAndCompress('git status', { exec: fakeExec({ stdout: raw, stderr: '', status: 0 }), metricsFile: metricsFile() });
  assert.equal(r.filtered, true);
  assert.doesNotMatch(r.stdout, /\(use /);
  assert.equal(r.exitCode, 0);
});

test('comando sem filtro passa saída intacta', () => {
  const r = runAndCompress('echo oi', { exec: fakeExec({ stdout: 'oi\n', stderr: '', status: 0 }), metricsFile: metricsFile() });
  assert.equal(r.filtered, false);
  assert.equal(r.stdout, 'oi\n');
});

test('comando sem família reconhecida ainda cai no genérico se a saída for enorme', () => {
  const many = Array.from({ length: 200 }, (_, i) => `linha ${i}`).join('\n');
  const r = runAndCompress('gh repo view', { exec: fakeExec({ stdout: many, stderr: '', status: 0 }), metricsFile: metricsFile() });
  assert.equal(r.filtered, true);
  assert.match(r.stdout, /…/);
  assert.ok(r.stdout.length < many.length);
});

test('exit code real é propagado', () => {
  const r = runAndCompress('pytest', { exec: fakeExec({ stdout: 'x FAILED', stderr: '', status: 3 }), metricsFile: metricsFile() });
  assert.equal(r.exitCode, 3);
});

test('stdout ausente não quebra (passthrough seguro)', () => {
  const r = runAndCompress('git status', { exec: fakeExec({ stdout: null, stderr: '', status: 0 }), metricsFile: metricsFile() });
  assert.equal(r.exitCode, 0);
  assert.equal(typeof r.stdout, 'string');
});

test('runAndCompress grava métrica quando filtra', () => {
  const dir = mkdtempSync(join(tmpdir(), 'econ-rm-'));
  const file = join(dir, 'metrics.jsonl');
  const many = Array.from({ length: 30 }, (_, i) => `commit ${i}`).join('\n');
  runAndCompress('git log', { exec: fakeExec({ stdout: many, stderr: '', status: 0 }), metricsFile: file });
  assert.ok(existsSync(file));
  const rec = JSON.parse(readFileSync(file, 'utf8').split('\n').filter(Boolean)[0]);
  assert.equal(rec.family, 'git-log');
  assert.ok(rec.tokensBefore > rec.tokensAfter);
  rmSync(dir, { recursive: true, force: true });
});

test('runAndCompress grava o agente na métrica', () => {
  const dir = mkdtempSync(join(tmpdir(), 'econ-ra-'));
  const file = join(dir, 'metrics.jsonl');
  runAndCompress('git status', {
    agent: 'copilot',
    exec: fakeExec({ stdout: 'On branch main\n  (use "git add" ...)', stderr: '', status: 0 }),
    metricsFile: file,
  });
  const rec = JSON.parse(readFileSync(file, 'utf8').split('\n').filter(Boolean)[0]);
  assert.equal(rec.agent, 'copilot');
  rmSync(dir, { recursive: true, force: true });
});

test('runAndCompress sem agente grava "unknown"', () => {
  const dir = mkdtempSync(join(tmpdir(), 'econ-ra2-'));
  const file = join(dir, 'metrics.jsonl');
  runAndCompress('echo oi', { exec: fakeExec({ stdout: 'oi\n', stderr: '', status: 0 }), metricsFile: file });
  const rec = JSON.parse(readFileSync(file, 'utf8').split('\n').filter(Boolean)[0]);
  assert.equal(rec.agent, 'unknown');
  rmSync(dir, { recursive: true, force: true });
});

test('shellCandidates prioriza ECON_SHELL e inclui bash + caminhos conhecidos', () => {
  const c = shellCandidates('bash', { ECON_SHELL: 'X:\\meu\\bash.exe' });
  assert.equal(c[0], 'X:\\meu\\bash.exe');
  assert.ok(c.includes('bash'));
  assert.ok(c.some((p) => /Git\\bin\\bash\.exe$/.test(p)));
});

test('shellCandidates para powershell inclui powershell', () => {
  const c = shellCandidates('powershell', {});
  assert.deepEqual(c, ['powershell']);
});

test('shellCandidates sem hint fica vazio (usa padrão do SO no fallback)', () => {
  assert.deepEqual(shellCandidates(undefined, {}), []);
});

test('passa o shell hint para o exec', () => {
  let captured;
  const exec = (cmd, shell) => {
    captured = shell;
    return { stdout: '', stderr: '', status: 0 };
  };
  runAndCompress('git status', { shell: 'bash', exec, metricsFile: metricsFile() });
  assert.equal(captured, 'bash');
});
