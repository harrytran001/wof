export function id(prefix: string): string {
  // good-enough for local-only state
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}


