import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'econ-test-'));
process.env.ECON_HOME = dir;
process.on('exit', () => rmSync(dir, { recursive: true, force: true }));
