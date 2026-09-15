import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const SKILL_PATH = join(__dirname, '..', '..', 'skills', 'econ-lazy', 'SKILL.md');
const MODES = ['lite', 'full', 'ultra'];

export function stripFrontmatter(text) {
  return text.replace(/^---[\s\S]*?---\s*/, '');
}

export function filterByMode(body, mode) {
  const effective = MODES.includes(mode) ? mode : 'full';
  return body
    .split(/\r?\n/)
    .filter((line) => {
      const tableLabel = line.match(/^\|\s*\*\*(.+?)\*\*\s*\|/);
      if (tableLabel) {
        const label = tableLabel[1].trim().toLowerCase();
        if (MODES.includes(label)) return label === effective;
      }
      const exampleLabel = line.match(/^-\s*([^:]+):\s*"/);
      if (exampleLabel) {
        const label = exampleLabel[1].trim().toLowerCase();
        if (MODES.includes(label)) return label === effective;
      }
      return true;
    })
    .join('\n');
}

export function buildLazyInstructions(mode, { skillPath = SKILL_PATH } = {}) {
  const raw = readFileSync(skillPath, 'utf8');
  const effective = MODES.includes(mode) ? mode : 'full';
  return `MODO ECONÔMICO ATIVO — nível: ${effective}\n\n${filterByMode(stripFrontmatter(raw), effective)}`;
}
