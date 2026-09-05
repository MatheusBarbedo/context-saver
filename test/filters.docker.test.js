import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dockerFilters } from '../src/filters/docker.js';

const docker = dockerFilters[0];

test('docker build longo é resumido em passos + resultado', () => {
  const lines = [
    ...Array.from({ length: 50 }, (_, i) => `#${i} building layer`),
    'Successfully built abc123',
    'Successfully tagged app:latest',
  ].join('\n');
  const out = docker.run({ command: 'docker build .', stdout: lines, stderr: '', exitCode: 0 });
  assert.match(out, /Successfully tagged/);
  assert.match(out, /linhas ocultas/);
});

test('docker build curto passa intacto', () => {
  const out = docker.run({ command: 'docker build .', stdout: 'ok', stderr: '', exitCode: 0 });
  assert.equal(out, null);
});
