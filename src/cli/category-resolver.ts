import type { Category, TransactionType } from "../core/types.ts";

export type ResolveResult =
  | { kind: "ok"; category: Category }
  | { kind: "unknown" }
  | { kind: "ambiguous"; matches: Category[] };

const norm = (s: string): string => s.trim().toLowerCase();

export const resolveCategory = (
  cats: Category[],
  input: string,
  type?: TransactionType,
): ResolveResult => {
  const q = norm(input);
  if (!q) return { kind: "unknown" };
  const pool = type ? cats.filter((c) => c.type === type) : cats;

  const byId = pool.find((c) => norm(c.id) === q);
  if (byId) return { kind: "ok", category: byId };

  const byShort = pool.find((c) => norm(c.id) === `cat-${q}`);
  if (byShort) return { kind: "ok", category: byShort };

  const byName = pool.find((c) => c.name.trim().toLowerCase() === q);
  if (byName) return { kind: "ok", category: byName };

  const idStem = (c: Category): string => c.id.replace(/^cat-/, "").toLowerCase();
  const fuzzy = pool.filter(
    (c) => idStem(c).includes(q) || c.name.toLowerCase().includes(q),
  );
  if (fuzzy.length === 1) return { kind: "ok", category: fuzzy[0] as Category };
  if (fuzzy.length > 1) return { kind: "ambiguous", matches: fuzzy };

  return { kind: "unknown" };
};

export const formatCategoryList = (cats: Category[]): string => {
  return cats
    .map((c) => `  ${c.id.padEnd(18)} ${c.name}  (${c.type})`)
    .join("\n");
};
