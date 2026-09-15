import {
  resolveDefaultMode,
  setSessionMode,
  clearSessionMode,
  readSessionMode,
  setDefaultMode,
  VALID_MODES,
} from './state.js';
import { buildLazyInstructions } from './instructions.js';

function isDeactivationCommand(text) {
  const t = String(text || '').trim().toLowerCase().replace(/[.!?\s]+$/, '');
  return t === 'stop lazy' || t === 'modo normal' || t === 'normal mode';
}

export function onSessionStart(agent) {
  const mode = resolveDefaultMode(agent);
  if (mode === 'off') {
    clearSessionMode(agent);
    return { mode: 'off', context: '' };
  }
  setSessionMode(agent, mode);
  return { mode, context: buildLazyInstructions(mode) };
}

export function onPromptSubmit(agent, prompt) {
  const text = String(prompt || '').trim().toLowerCase();

  if (/^\/lazy\b/.test(text)) {
    const parts = text.split(/\s+/);
    const arg = parts[1] || '';

    if (arg === 'default') {
      const dmode = parts[2];
      if (VALID_MODES.includes(dmode)) {
        setDefaultMode(agent, dmode);
        return {
          mode: dmode,
          context: `PADRÃO DO MODO ECONÔMICO DEFINIDO — novas sessões começam em ${dmode}.`,
          changed: true,
        };
      }
      return { mode: readSessionMode(agent) || resolveDefaultMode(agent), context: '', changed: false };
    }

    if (arg === 'off') {
      clearSessionMode(agent);
      return { mode: 'off', context: 'MODO ECONÔMICO DESLIGADO', changed: true };
    }

    if (VALID_MODES.includes(arg)) {
      setSessionMode(agent, arg);
      return {
        mode: arg,
        context: `MODO ECONÔMICO MUDOU — nível: ${arg}\n\n${buildLazyInstructions(arg)}`,
        changed: true,
      };
    }

    const current = readSessionMode(agent) || resolveDefaultMode(agent);
    if (current === 'off') {
      return { mode: current, context: 'MODO ECONÔMICO DESLIGADO', changed: false };
    }
    return { mode: current, context: `MODO ECONÔMICO ATIVO — nível: ${current}`, changed: false };
  }

  if (isDeactivationCommand(text)) {
    clearSessionMode(agent);
    return { mode: 'off', context: 'MODO ECONÔMICO DESLIGADO', changed: true };
  }

  return { mode: readSessionMode(agent) || 'off', context: '', changed: false };
}

export function onSubagentStart(agent) {
  const mode = readSessionMode(agent);
  if (!mode || mode === 'off') return { mode: 'off', context: '' };
  return { mode, context: buildLazyInstructions(mode) };
}
