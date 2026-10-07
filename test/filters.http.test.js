import './isolate.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { httpFilters } from '../src/filters/http.js';

const http = httpFilters[0];

test('curl -v mantém status e headers, corta corpo grande', () => {
  const body = Array.from({ length: 200 }, (_, i) => `body line ${i}`).join('\n');
  const raw = `< HTTP/1.1 200 OK\n< Content-Type: application/json\n${body}`;
  const out = http.run({ command: 'curl -v http://x', stdout: raw, stderr: '', exitCode: 0 });
  assert.match(out, /HTTP\/1\.1 200 OK/);
  assert.match(out, /linhas ocultas/);
});

test('resposta curta passa intacta', () => {
  const out = http.run({ command: 'curl http://x', stdout: 'ok', stderr: '', exitCode: 0 });
  assert.equal(out, null);
});
