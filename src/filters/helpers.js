export function splitLines(text) {
  const lines = String(text ?? '').replace(/\r\n/g, '\n').split('\n');
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

export function stripLines(lines, regex) {
  return lines.filter((l) => !regex.test(l));
}

export function collapseBlankRuns(lines) {
  const out = [];
  let prevBlank = false;
  for (const l of lines) {
    const blank = l.trim() === '';
    if (blank && prevBlank) continue;
    out.push(l);
    prevBlank = blank;
  }
  return out;
}

export function countHidden(originalLines, keptLines) {
  return Math.max(0, originalLines.length - keptLines.length);
}
