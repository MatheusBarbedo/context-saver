import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installFilters } from '../src/filters/install.js';

const f = installFilters[0];

test('casa npm/pnpm/pip install', () => {
  assert.ok(f.test('npm install'));
  assert.ok(f.test('pnpm i react'));
  assert.ok(f.test('pip install requests'));
  assert.equal(f.test('npm test'), false);
});

test('sucesso mantém só as linhas de resultado', () => {
  const raw = [
    'npm warn deprecated x',
    '⠋ reify:pkg: timing',
    '⠙ reify:pkg2: timing',
    'added 128 packages in 3s',
    '12 packages are looking for funding',
  ].join('\n');
  const out = f.run({ command: 'npm install', stdout: raw, stderr: '', exitCode: 0 });
  assert.match(out, /added 128 packages/);
  assert.doesNotMatch(out, /reify:pkg2/);
});

test('pip successfully installed é preservado', () => {
  const raw = ['Collecting requests', 'Downloading ...', 'Successfully installed requests-2.31.0'].join('\n');
  const out = f.run({ command: 'pip install requests', stdout: raw, stderr: '', exitCode: 0 });
  assert.match(out, /Successfully installed requests/);
});
