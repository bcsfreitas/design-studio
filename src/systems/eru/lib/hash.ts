/** O hash FNV-1a de um texto, sem sinal: o mesmo texto dá sempre o mesmo número. */
export function hashString(text: string) {
  let hash = 2166136261

  for (const char of text) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0
  }

  return hash
}
