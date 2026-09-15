function lazyHookCommand(econJs, agent, event) {
  return `node "${econJs}" lazy-hook --agent ${agent} --event ${event}`;
}

function isLazyEntry(h) {
  return typeof h?.command === 'string' && h.command.includes('lazy-hook');
}

export function removeClaudeLazyHooks(settings) {
  const next = structuredClone(settings ?? {});
  for (const event of ['SessionStart', 'UserPromptSubmit', 'SubagentStart']) {
    const groups = next.hooks?.[event];
    if (!groups) continue;
    next.hooks[event] = groups
      .map((g) => ({ ...g, hooks: (g.hooks ?? []).filter((h) => !isLazyEntry(h)) }))
      .filter((g) => g.hooks.length > 0);
  }
  return next;
}

export function addClaudeLazyHooks(settings, econJs) {
  const next = removeClaudeLazyHooks(settings ?? {});
  next.hooks = next.hooks ?? {};
  next.hooks.SessionStart = next.hooks.SessionStart ?? [];
  next.hooks.SessionStart.push({
    matcher: 'startup|resume|clear|compact',
    hooks: [{ type: 'command', command: lazyHookCommand(econJs, 'claude', 'session-start') }],
  });
  next.hooks.UserPromptSubmit = next.hooks.UserPromptSubmit ?? [];
  next.hooks.UserPromptSubmit.push({
    hooks: [{ type: 'command', command: lazyHookCommand(econJs, 'claude', 'prompt-submit') }],
  });
  next.hooks.SubagentStart = next.hooks.SubagentStart ?? [];
  next.hooks.SubagentStart.push({
    hooks: [{ type: 'command', command: lazyHookCommand(econJs, 'claude', 'subagent-start') }],
  });
  return next;
}

export function hasClaudeLazyHooks(settings) {
  const groups = settings?.hooks?.SessionStart ?? [];
  return groups.some((g) => (g.hooks ?? []).some(isLazyEntry));
}

const LAZY_EVENTS = [
  ['SessionStart', 'session-start'],
  ['UserPromptSubmit', 'prompt-submit'],
  ['SubagentStart', 'subagent-start'],
];

export function removeCodexLazyHooks(config) {
  const next = structuredClone(config ?? {});
  for (const [event] of LAZY_EVENTS) {
    if (!next.hooks?.[event]) continue;
    next.hooks[event] = next.hooks[event].filter((h) => !isLazyEntry(h));
  }
  return next;
}

export function addCodexLazyHooks(config, econJs) {
  const next = removeCodexLazyHooks(config ?? {});
  next.hooks = next.hooks ?? {};
  for (const [event, name] of LAZY_EVENTS) {
    next.hooks[event] = next.hooks[event] ?? [];
    next.hooks[event].push({ command: lazyHookCommand(econJs, 'codex', name) });
  }
  return next;
}

export function hasCodexLazyHooks(config) {
  const list = config?.hooks?.SessionStart ?? [];
  return list.some(isLazyEntry);
}
