export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^the /, '')
    // OpenBeta often stores names as "Loaf, The".
    .replace(/ the$/, '');
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Returns the first existing name that looks like the same climb, or null. */
export function findSimilarName<T extends { name: string }>(name: string, existing: T[]): T | null {
  const target = normalizeName(name);
  if (target.length < 3) return null;
  for (const item of existing) {
    const other = normalizeName(item.name);
    if (other.length < 3) continue;
    if (other === target || other.includes(target) || target.includes(other)) return item;
    if (levenshtein(target, other) <= 2) return item;
  }
  return null;
}
