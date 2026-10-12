// Shared JSON value validation for persisted preferences and public build assets.
export function serializeJson(value: unknown): string {
  const seen = new Set<object>();
  function visit(value: unknown) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
    if (typeof value === 'number' && Number.isFinite(value)) return;
    if (
      typeof value !== 'object' ||
      seen.has(value) ||
      (!Array.isArray(value) && ![Object.prototype, null].includes(Object.getPrototypeOf(value)))
    )
      throw new Error('Values must contain only serializable JSON values.');
    seen.add(value);
    for (const child of Array.isArray(value) ? value : Object.values(value)) visit(child);
    seen.delete(value);
  }
  visit(value);
  return JSON.stringify(value);
}
