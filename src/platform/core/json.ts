// Serialize one validated data snapshot without invoking getters or toJSON hooks.
export function serializeJson(value: unknown): string {
  const seen = new Set<object>();
  const invalid = () => new Error('Values must contain only serializable JSON data without accessors.');
  function snapshot(value: unknown): unknown {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (
      typeof value !== 'object' ||
      seen.has(value) ||
      (!Array.isArray(value) && ![Object.prototype, null].includes(Object.getPrototypeOf(value)))
    )
      throw invalid();
    seen.add(value);
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const key of Reflect.ownKeys(descriptors)) {
      if (typeof key !== 'string' || !('value' in descriptors[key])) throw invalid();
    }
    let result: unknown;
    if (Array.isArray(value)) {
      const array: unknown[] = [];
      for (let index = 0; index < descriptors.length.value; index++) {
        const item = descriptors[String(index)];
        if (!item) throw invalid();
        array.push(snapshot(item.value));
      }
      result = array;
    } else {
      const object: Record<string, unknown> = Object.create(null);
      for (const [key, descriptor] of Object.entries(descriptors)) {
        if (descriptor.enumerable) object[key] = snapshot(descriptor.value);
      }
      result = object;
    }
    seen.delete(value);
    return result;
  }
  return JSON.stringify(snapshot(value));
}
