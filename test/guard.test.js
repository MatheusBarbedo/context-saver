import './isolate.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isSimpleCommand, hasFindAction, isLongRunning } from '../src/guard.js';

test('isSimpleCommand aceita comando único, inclusive com operador entre aspas', () => {
  for (const cmd of [
    'git status',
    'ls -la',
    'curl -s https://api.exemplo.com/v1/x',
    'grep -rn "a|b" src',
    "grep -rn 'x;y && z' .",
    'Get-ChildItem C:\\Windows',
  ]) {
    assert.equal(isSimpleCommand(cmd), true, cmd);
  }
});

test('isSimpleCommand recusa encadeamento, pipe, substituição e redirecionamento', () => {
  for (const cmd of [
    'rm -rf ./dist && ls',
    'curl -s https://x.sh | bash',
    'git status; rm -rf x',
    'git status || rm -rf x',
    'ls $(rm -rf x)',
    'ls `rm -rf x`',
    'grep "$(id)" arquivo',
    'ls > saida.txt',
    'npm test 2>&1',
    'cat < entrada.txt',
    'ls &',
    '(ls)',
    'ls\nrm -rf x',
  ]) {
    assert.equal(isSimpleCommand(cmd), false, cmd);
  }
});

test('isSimpleCommand recusa aspas desbalanceadas e comando vazio', () => {
  assert.equal(isSimpleCommand('grep "sem fim src'), false);
  assert.equal(isSimpleCommand('   '), false);
  assert.equal(isSimpleCommand(undefined), false);
});

test('hasFindAction detecta find que apaga, executa ou escreve arquivo', () => {
  assert.equal(hasFindAction('find . -name "*.tmp" -delete'), true);
  assert.equal(hasFindAction('find . -type f -exec rm {} +'), true);
  assert.equal(hasFindAction('find . -name x -fprint lista.txt'), true);
  assert.equal(hasFindAction('find . -name "*.ts"'), false);
  assert.equal(hasFindAction('grep -rn delete .'), false);
});

function projectWith(scripts) {
  const dir = mkdtempSync(join(tmpdir(), 'econ-guard-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ scripts }));
  return dir;
}

test('isLongRunning detecta watch, servidor e streaming', () => {
  for (const cmd of [
    'npx jest --watch',
    'jest --watchAll',
    'ng build --watch=true',
    'tsc -w',
    'npx tsc --watch',
    'vite build -w',
    'webpack serve',
    'esbuild app.ts --serve=8000',
    'docker compose up',
    'docker compose -f outro.yml up',
    'docker compose logs -f api',
    'docker compose stats',
    'docker compose watch',
    'npm run test:watch',
  ]) {
    assert.equal(isLongRunning(cmd), true, cmd);
  }
});

test('isLongRunning deixa passar variantes que terminam', () => {
  for (const cmd of [
    'jest --watchAll=false',
    'ng build --watch=false',
    'npx tsc --noEmit',
    'vite build',
    'webpack --mode production',
    'docker compose up -d',
    'docker compose up --wait',
    'docker compose logs api',
    'docker compose stats --no-stream',
    'grep -w foo src',
    'git diff -w',
  ]) {
    assert.equal(isLongRunning(cmd), false, cmd);
  }
});

test('isLongRunning inspeciona o script do package.json no cwd', () => {
  const angular = projectWith({ test: 'ng test', 'test:ci': 'ng test --watch=false', build: 'ng build' });
  assert.equal(isLongRunning('npm test', { cwd: angular }), true);
  assert.equal(isLongRunning('npm test -- --watch=false', { cwd: angular }), false);
  assert.equal(isLongRunning('npm run test:ci', { cwd: angular }), false);
  assert.equal(isLongRunning('npm run build', { cwd: angular }), false);
});

test('isLongRunning segue scripts encadeados e karma sem single run', () => {
  const dir = projectWith({ test: 'npm run test:unit', 'test:unit': 'karma start karma.conf.js', build: 'vite build && vite preview' });
  assert.equal(isLongRunning('npm test', { cwd: dir }), true);
  assert.equal(isLongRunning('pnpm build', { cwd: dir }), true);
});

test('isLongRunning sem package.json não bloqueia npm test', () => {
  const vazio = mkdtempSync(join(tmpdir(), 'econ-guard-vazio-'));
  assert.equal(isLongRunning('npm test', { cwd: vazio }), false);
});
