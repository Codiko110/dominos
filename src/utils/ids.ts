export function createId(prefix = 'id') {
  // Offline-friendly unique-ish id without extra deps.
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

