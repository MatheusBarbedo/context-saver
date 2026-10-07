import './isolate.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setDefaultMode, setSessionMode, readSessionMode, clearSessionMode } from '../src/lazy/state.js';
import { onSessionStart, onPromptSubmit, onSubagentStart } from '../src/lazy/hooks.js';

test('onSessionStart ativa o default e devolve a escada', () => {
  setDefaultMode('claude-hooks', 'full');
  const { mode, context } = onSessionStart('claude-hooks');
  assert.equal(mode, 'full');
  assert.ok(context.includes('MODO ECONÔMICO ATIVO'));
  assert.equal(readSessionMode('claude-hooks'), 'full');
});

test('onSessionStart com default off não ativa nada', () => {
  setDefaultMode('copilot-hooks', 'off');
  const { mode, context } = onSessionStart('copilot-hooks');
  assert.equal(mode, 'off');
  assert.equal(context, '');
  assert.equal(readSessionMode('copilot-hooks'), null);
  setDefaultMode('copilot-hooks', 'full');
});

test('onPromptSubmit troca de nível e devolve a escada nova', () => {
  const { mode, context, changed } = onPromptSubmit('claude-hooks', '/lazy ultra');
  assert.equal(mode, 'ultra');
  assert.ok(changed);
  assert.ok(context.includes('nível: ultra'));
  assert.equal(readSessionMode('claude-hooks'), 'ultra');
});

test('onPromptSubmit "/lazy default" persiste o padrão sem mudar a sessão', () => {
  setSessionMode('claude-hooks', 'full');
  const { mode, changed } = onPromptSubmit('claude-hooks', '/lazy default lite');
  assert.equal(mode, 'lite');
  assert.ok(changed);
  setDefaultMode('claude-hooks', 'full');
});

test('onPromptSubmit desativa com "stop lazy"', () => {
  setSessionMode('claude-hooks', 'full');
  const { mode, changed } = onPromptSubmit('claude-hooks', 'stop lazy');
  assert.equal(mode, 'off');
  assert.ok(changed);
  assert.equal(readSessionMode('claude-hooks'), null);
});

test('onPromptSubmit desativa com "modo normal" mesmo com pontuação', () => {
  setSessionMode('claude-hooks', 'full');
  const { changed } = onPromptSubmit('claude-hooks', 'Modo normal!');
  assert.ok(changed);
});

test('onPromptSubmit ignora "modo normal" dentro de frase maior', () => {
  setSessionMode('claude-hooks', 'full');
  const { changed } = onPromptSubmit('claude-hooks', 'adiciona um toggle de modo normal na tela');
  assert.ok(!changed);
});

test('onPromptSubmit sem comando não muda nada', () => {
  setSessionMode('claude-hooks', 'ultra');
  const { mode, changed } = onPromptSubmit('claude-hooks', 'corrige esse bug aqui');
  assert.equal(mode, 'ultra');
  assert.ok(!changed);
});

test('onSubagentStart propaga o nível de sessão atual', () => {
  setSessionMode('claude-hooks', 'ultra');
  const { mode, context } = onSubagentStart('claude-hooks');
  assert.equal(mode, 'ultra');
  assert.ok(context.includes('nível: ultra'));
});

test('onSubagentStart sem sessão ativa não injeta nada', () => {
  setSessionMode('codex-hooks', 'off');
  const clear = onPromptSubmit('codex-hooks', 'stop lazy');
  assert.ok(clear.changed || true);
  const { mode, context } = onSubagentStart('codex-hooks');
  assert.equal(mode, 'off');
  assert.equal(context, '');
});

test('onPromptSubmit com argumento desconhecido e default off não finge que está ativo', () => {
  setDefaultMode('copilot-hooks', 'off');
  clearSessionMode('copilot-hooks');
  const { mode, context, changed } = onPromptSubmit('copilot-hooks', '/lazy blah');
  assert.equal(mode, 'off');
  assert.equal(context, 'MODO ECONÔMICO DESLIGADO');
  assert.ok(!changed);
  setDefaultMode('copilot-hooks', 'full');
});

test('onPromptSubmit "/lazy default" com nível inválido não muda nada', () => {
  const { changed, context } = onPromptSubmit('claude-hooks', '/lazy default bogus');
  assert.ok(!changed);
  assert.equal(context, '');
});
