import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { teeSave, withRecovery, teeFilePath } from '../src/tee.js';

test('teeSave grava conteúdo e retorna id + caminho existente', () => {
  const { id, file } = teeSave('conteudo completo');
  assert.ok(existsSync(file));
  assert.equal(file, teeFilePath(id));
  assert.equal(readFileSync(file, 'utf8'), 'conteudo completo');
});

test('withRecovery sem linhas ocultas retorna o resumo puro', () => {
  assert.equal(withRecovery('resumo', 0, 'full'), 'resumo');
});

test('withRecovery com linhas ocultas anexa instrução econ show e cria arquivo', () => {
  const out = withRecovery('resumo', 5, 'linha1\nlinha2');
  assert.match(out, /\+5 linhas ocultas/);
  const m = out.match(/econ show (\S+)/);
  assert.ok(m && existsSync(teeFilePath(m[1])));
});
