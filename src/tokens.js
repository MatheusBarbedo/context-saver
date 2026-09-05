export function estimateTokens(text) {
  const s = String(text ?? '');
  return Math.ceil(s.length / 4);
}
