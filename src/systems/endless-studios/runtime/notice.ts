// The stand-ins fail softly: each gap (a missing key, an unknown store action, an unmocked query) is reported once
// per page, so it stays visible in the console without repeating on every render.
const seen = new Set<string>();

export function noticeOnce(key: string, ...message: unknown[]) {
  if (seen.has(key)) return;
  seen.add(key);
  console.warn('[Endless Studios]', ...message);
}
