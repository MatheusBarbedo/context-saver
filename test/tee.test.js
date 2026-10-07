import './isolate.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { join, isAbsolute } from 'node:path';
import { teeSave, withRecovery, teeFilePath, teeDir, pruneTee, TEE_TTL_MS } from '../src/tee.js';

test('teeSave grava conteúdo e retorna id + caminho existente', () => {
  const { id, file } = teeSave('conteudo completo');
  assert.ok(existsSync(file));
  assert.equal(file, teeFilePath(id));
  assert.equal(readFileSync(file, 'utf8'), 'conteudo completo');
});

test('tee fica dentro do ECON_HOME, não no diretório temporário do sistema', () => {
  const { file } = teeSave('x');
  assert.ok(file.startsWith(join(process.env.ECON_HOME, 'tee')));
});

test('arquivo e pasta do tee têm permissão restrita ao dono', { skip: process.platform === 'win32' }, () => {
  const { file } = teeSave('segredo');
  assert.equal(statSync(file).mode & 0o777, 0o600);
  assert.equal(statSync(teeDir()).mode & 0o777, 0o700);
});

test('pruneTee apaga arquivos mais velhos que o TTL e mantém os recentes', () => {
  const { file: recente } = teeSave('novo');
  const antigo = join(teeDir(), 'antigo.log');
  writeFileSync(antigo, 'velho');
  const passado = new Date(Date.now() - TEE_TTL_MS - 60_000);
  utimesSync(antigo, passado, passado);
  pruneTee();
  assert.equal(existsSync(antigo), false);
  assert.ok(existsSync(recente));
});

test('teeFilePath rejeita id com caminho relativo', () => {
  assert.throws(() => teeFilePath('../../etc/passwd'));
  assert.throws(() => teeFilePath('a/b'));
});

test('withRecovery sem linhas ocultas retorna o resumo puro', () => {
  assert.equal(withRecovery('resumo', 0, 'full'), 'resumo');
});

test('withRecovery com linhas ocultas informa o caminho absoluto da saída completa', () => {
  const out = withRecovery('resumo', 5, 'linha1\nlinha2');
  assert.match(out, /\+5 linhas ocultas/);
  const m = out.match(/Saída completa: (.+) \(leia só o trecho necessário\)$/);
  assert.ok(m && isAbsolute(m[1]));
  assert.equal(readFileSync(m[1], 'utf8'), 'linha1\nlinha2');
  assert.doesNotMatch(out, /econ show/);
});
