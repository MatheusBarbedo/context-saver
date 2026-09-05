import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const CLAUDEIGNORE_TEMPLATE = [
  'node_modules/',
  'dist/',
  'build/',
  'coverage/',
  '.next/',
  '.venv/',
  '*.log',
  '*.lock',
  'package-lock.json',
  'pnpm-lock.yaml',
  '.env',
  '.env.*',
].join('\n') + '\n';

const COPILOT_INSTRUCTIONS_TEMPLATE = [
  '# Instruções do projeto',
  '',
  'Descreva aqui, em 300–500 palavras, o que o Copilot precisa saber para não',
  'reexplicar o projeto a cada sessão: propósito, stack, convenções, como rodar',
  'testes e o que evitar.',
  '',
].join('\n');

function wordCount(file) {
  try {
    return readFileSync(file, 'utf8').trim().split(/\s+/).filter(Boolean).length;
  } catch {
    return 0;
  }
}

function mcpCount(home) {
  try {
    const cfg = JSON.parse(readFileSync(join(home, '.claude.json'), 'utf8'));
    return Object.keys(cfg.mcpServers || {}).length;
  } catch {
    return 0;
  }
}

export function runChecks({ cwd = process.cwd(), home = homedir() } = {}) {
  const claudeMd = join(cwd, 'CLAUDE.md');
  const hasClaudeMd = existsSync(claudeMd);
  const words = hasClaudeMd ? wordCount(claudeMd) : 0;
  const copilotMd = join(cwd, '.github', 'copilot-instructions.md');
  const hasCopilotMd = existsSync(copilotMd);
  const copilotWords = hasCopilotMd ? wordCount(copilotMd) : 0;
  const hasGitignore = existsSync(join(cwd, '.gitignore'));
  const hasClaudeignore = existsSync(join(cwd, '.claudeignore'));
  const mcps = mcpCount(home);
  return [
    {
      id: 'claude-md',
      ok: words >= 300 && words <= 600,
      detail: hasClaudeMd ? `${words} palavras` : 'ausente',
      why: 'CLAUDE.md de 300–600 palavras evita reexplicar o projeto a cada sessão.',
    },
    {
      id: 'copilot-instructions',
      ok: copilotWords >= 100,
      detail: hasCopilotMd ? `${copilotWords} palavras` : 'ausente',
      why: '.github/copilot-instructions.md é o equivalente do CLAUDE.md para o Copilot.',
    },
    {
      id: 'gitignore',
      ok: hasGitignore,
      detail: hasGitignore ? 'presente' : 'ausente',
      why: '.gitignore evita que arquivos irrelevantes entrem no contexto.',
    },
    {
      id: 'claudeignore',
      ok: hasClaudeignore,
      detail: hasClaudeignore ? 'presente' : 'ausente',
      why: '.claudeignore mantém arquivos pesados/gerados fora do contexto do agente.',
    },
    {
      id: 'mcp-count',
      ok: mcps <= 5,
      detail: `${mcps} MCP(s) conectados`,
      why: 'Cada MCP conectado injeta definições de ferramentas no contexto; desligue os não usados.',
    },
  ];
}

export function applyFix({ cwd = process.cwd() } = {}) {
  const created = [];
  const claudeignore = join(cwd, '.claudeignore');
  if (!existsSync(claudeignore)) {
    writeFileSync(claudeignore, CLAUDEIGNORE_TEMPLATE, 'utf8');
    created.push(claudeignore);
  }
  const copilotMd = join(cwd, '.github', 'copilot-instructions.md');
  if (!existsSync(copilotMd)) {
    mkdirSync(join(cwd, '.github'), { recursive: true });
    writeFileSync(copilotMd, COPILOT_INSTRUCTIONS_TEMPLATE, 'utf8');
    created.push(copilotMd);
  }
  return created;
}
