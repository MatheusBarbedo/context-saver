import { splitLines, countHidden } from './helpers.js';
import { withRecovery } from '../tee.js';

const CMD = /^\s*(?:(?:npx\s+)?(?:vite\s+build|webpack|rollup|esbuild|(?:next|nuxt|ng)\s+build)|npm\s+run\s+build|pnpm\s+build)\b/;
const KEEP = /(error|warning|failed|\.(js|css|html|map)\b|\bkB\b|\bMB\b|built in|compiled|Compiled|bundle)/i;

const bundlerFilter = {
  name: 'bundler',
  test: (cmd) => CMD.test(cmd),
  run: ({ stdout, stderr }) => {
    const full = stdout + (stderr ? `\n${stderr}` : '');
    const lines = splitLines(full);
    if (lines.length <= 30) return null;
    const kept = lines.filter((l) => KEEP.test(l));
    if (kept.length === 0) return null;
    return withRecovery(kept.join('\n'), countHidden(lines, kept), full);
  },
};

export const bundlerFilters = [bundlerFilter];
