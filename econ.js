#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { handle } from './src/hook-adapter.js';
import { runAndCompress } from './src/runner.js';
import { isEnabled, setEnabled } from './src/state.js';
import {
  installClaude,
  installCopilot,
  installCodex,
  uninstallClaude,
  uninstallCopilot,
  uninstallCodex,
  statusPaths,
} from './src/installer.js';
import { aggregate } from './src/metrics.js';
import { readRecovery } from './src/show.js';
import { purgeData, ECON_JS } from './src/state.js';
import { runChecks, applyFix } from './src/doctor.js';
import { dispatchLazyHook } from './src/lazy/dispatch.js';
import {
  installLazyClaude,
  uninstallLazyClaude,
  installLazyCopilot,
  uninstallLazyCopilot,
  installLazyCodex,
  uninstallLazyCodex,
  statusLazyPaths,
} from './src/lazy/setup.js';
import { setDefaultMode } from './src/lazy/state.js';
import { scanDebt, formatDebtReport } from './src/lazy/debt.js';

function flagValue(args, flag) {
  const i = args.indexOf(flag);
  return i === -1 ? undefined : args[i + 1];
}

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function decodeRunArgs(args) {
  let shell;
  let agent;
  const rest = [...args];
  if (rest[0] === '--shell' && rest[1]) {
    shell = rest[1];
    rest.splice(0, 2);
  }
  if (rest[0] === '--agent' && rest[1]) {
    agent = rest[1];
    rest.splice(0, 2);
  }
  let command;
  if (rest[0] === '--b64' && rest[1]) {
    command = Buffer.from(rest[1], 'base64').toString('utf8');
  } else {
    command = rest.join(' ');
  }
  return { command, shell, agent };
}

const [cmd, ...rest] = process.argv.slice(2);

switch (cmd) {
  case 'hook': {
    const agent = rest[0] === '--agent' ? rest[1] : undefined;
    const { output, exitCode } = handle(readStdin(), { enabled: isEnabled(), agent });
    if (output) process.stdout.write(output);
    process.exit(exitCode);
    break;
  }
  case 'lazy-hook': {
    const agent = flagValue(rest, '--agent');
    const event = flagValue(rest, '--event');
    let payload = {};
    try {
      payload = JSON.parse(readStdin() || '{}');
    } catch {
      payload = {};
    }
    try {
      const output = dispatchLazyHook({ agent, event, payload });
      if (output) process.stdout.write(output);
    } catch (e) {
      process.stderr.write(String(e.message || e));
    }
    process.exit(0);
    break;
  }
  case 'run': {
    const { command, shell, agent } = decodeRunArgs(rest);
    const { stdout, stderr, exitCode } = runAndCompress(command, { shell, agent });
    if (stdout) process.stdout.write(stdout.endsWith('\n') ? stdout : stdout + '\n');
    if (stderr) process.stderr.write(stderr);
    process.exit(exitCode);
    break;
  }
  case 'install': {
    const target = rest[0];
    if (target === 'claude') console.log('Claude hook instalado em', installClaude());
    else if (target === 'copilot') console.log('Copilot hook instalado em', installCopilot());
    else if (target === 'codex') console.log('Codex hook instalado em', installCodex());
    else {
      console.log('Claude:', installClaude());
      console.log('Copilot:', installCopilot());
      console.log('Codex:', installCodex());
    }
    break;
  }
  case 'uninstall': {
    const purge = rest.includes('--purge');
    const target = rest.find((a) => a !== '--purge');
    if (target === 'claude') console.log('Claude hook removido de', uninstallClaude());
    else if (target === 'copilot') console.log('Copilot hook removido de', uninstallCopilot());
    else if (target === 'codex') console.log('Codex hook removido de', uninstallCodex());
    else {
      console.log('Claude:', uninstallClaude());
      console.log('Copilot:', uninstallCopilot());
      console.log('Codex:', uninstallCodex());
    }
    if (purge) {
      purgeData();
      console.log('Métricas e estado apagados (~/.context-saver)');
    }
    break;
  }
  case 'on':
    setEnabled(true);
    console.log('context-saver LIGADO');
    break;
  case 'off':
    setEnabled(false);
    console.log('context-saver DESLIGADO');
    break;
  case 'status': {
    const s = statusPaths();
    console.log('Ativo:', isEnabled() ? 'sim' : 'não');
    console.log('Claude hook:', s.claude.installed ? 'instalado' : 'não', `(${s.claude.path})`);
    console.log('Copilot hook:', s.copilot.installed ? 'instalado' : 'não', `(${s.copilot.path})`);
    console.log('Codex hook:', s.codex.installed ? 'instalado' : 'não', `(${s.codex.path})`);
    break;
  }
  case 'stats': {
    const a = aggregate();
    const savedTokens = a.totalTokensBefore - a.totalTokensAfter;
    const pct = a.totalTokensBefore ? Math.round((savedTokens / a.totalTokensBefore) * 100) : 0;
    console.log(`Comandos medidos: ${a.count}`);
    console.log(`Tokens: ${a.totalTokensBefore} → ${a.totalTokensAfter} (economia ${savedTokens}, ${pct}%)`);
    console.log('Por família:');
    for (const [fam, f] of Object.entries(a.byFamily)) {
      console.log(`  ${fam}: ${f.tokensBefore} → ${f.tokensAfter} (${f.count}x)`);
    }
    console.log('Por agente:');
    for (const [agent, ag] of Object.entries(a.byAgent)) {
      console.log(`  ${agent}: ${ag.tokensBefore} → ${ag.tokensAfter} (${ag.count}x)`);
    }
    break;
  }
  case 'show': {
    const id = rest[0];
    if (!id) {
      console.error('Uso: econ show <id> [--lines A-B] [--grep X]');
      process.exit(1);
    }
    const opts = {};
    for (let i = 1; i < rest.length; i++) {
      if (rest[i] === '--lines') opts.lines = rest[++i];
      else if (rest[i] === '--grep') opts.grep = rest[++i];
    }
    try {
      console.log(readRecovery(id, opts));
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
    break;
  }
  case 'doctor': {
    if (rest.includes('--fix')) {
      const created = applyFix();
      if (created.length === 0) console.log('Nada a criar: .claudeignore e copilot-instructions já existem.');
      else for (const f of created) console.log('Criado:', f);
      break;
    }
    for (const c of runChecks()) {
      console.log(`${c.ok ? '✔' : '✖'} ${c.id}: ${c.detail}`);
      if (!c.ok) console.log(`   ${c.why}`);
    }
    break;
  }
  case 'lazy': {
    const sub = rest[0];
    if (sub === 'install') {
      const target = rest[1];
      if (target === 'claude' || !target) console.log('Claude lazy:', installLazyClaude(ECON_JS));
      if (target === 'copilot' || !target) console.log('Copilot lazy:', installLazyCopilot(ECON_JS));
      if (target === 'codex' || !target) console.log('Codex lazy:', installLazyCodex(ECON_JS));
    } else if (sub === 'uninstall') {
      const purge = rest.includes('--purge');
      const target = rest.slice(1).find((a) => a !== '--purge');
      if (target === 'claude' || !target) console.log('Claude lazy removido de', uninstallLazyClaude({ purge }));
      if (target === 'copilot' || !target) console.log('Copilot lazy removido de', uninstallLazyCopilot());
      if (target === 'codex' || !target) console.log('Codex lazy removido de', uninstallLazyCodex());
    } else if (sub === 'status') {
      const s = statusLazyPaths();
      console.log('Claude:', s.claude.installed ? 'instalado' : 'não instalado', `(${s.claude.path})`, '| skills:', s.claude.skills ? 'sim' : 'não');
      console.log('Copilot:', s.copilot.installed ? 'instalado' : 'não instalado', `(${s.copilot.path})`);
      console.log('Codex:', s.codex.installed ? 'instalado' : 'não instalado', `(${s.codex.path})`);
    } else if (sub === 'debt') {
      console.log(formatDebtReport(scanDebt()));
    } else if (sub === 'default') {
      const mode = rest[1];
      const target = rest[2];
      if (!['off', 'lite', 'full', 'ultra'].includes(mode)) {
        console.error('Uso: node econ.js lazy default <off|lite|full|ultra> [claude|copilot|codex]');
        process.exit(1);
      }
      for (const agent of target ? [target] : ['claude', 'copilot', 'codex']) {
        setDefaultMode(agent, mode);
      }
      console.log(`Nível padrão definido como ${mode}${target ? ` (${target})` : ' (claude, copilot, codex)'}.`);
    } else {
      console.log(
        'Uso: node econ.js lazy <install [claude|copilot|codex] | uninstall [claude|copilot|codex] [--purge] | status | debt | default <off|lite|full|ultra> [agente]>',
      );
      process.exit(sub ? 1 : 0);
    }
    break;
  }
  default:
    console.log(
      'Uso: node econ.js <install [claude|copilot|codex] | uninstall [claude|copilot|codex] [--purge] | on | off | status | stats | show <id> | doctor | hook | run <cmd> | lazy <install|uninstall|status|debt|default>>',
    );
    process.exit(cmd ? 1 : 0);
}
