import { today } from "../core/date.ts";
import { money } from "../core/format.ts";
import { loadDb, saveDb } from "../core/storage.ts";
import type { Transaction } from "../core/types.ts";
import type { ParsedArgs } from "./argv.ts";
import { resolveCategory } from "./category-resolver.ts";
import { fail, isDryRun, isJson, okJson } from "./output.ts";

const isYmd = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s);

const isTxId = (id: string): boolean =>
  id.startsWith("tx-") || id.startsWith("txn-");

export const runEdit = async (args: ParsedArgs): Promise<number> => {
  const id = args.positional[0];
  if (!id) {
    return fail(
      args,
      "Usage: finance edit <id> [--amount N] [--category <name>] [--note <text>] [--date YYYY-MM-DD]",
      "EVALIDATION",
    );
  }
  if (!isTxId(id)) {
    return fail(
      args,
      `edit supports transactions only; for loans use 'finance loan edit': ${id}`,
      "EVALIDATION",
    );
  }

  const amountFlag = args.flags["amount"];
  const categoryFlag = args.flags["category"];
  const noteFlag = args.flags["note"];
  const dateFlag = args.flags["date"];

  if (
    amountFlag === undefined &&
    categoryFlag === undefined &&
    noteFlag === undefined &&
    dateFlag === undefined
  ) {
    return fail(
      args,
      "Nothing to update. Pass at least one of --amount, --category, --note, --date.",
      "EVALIDATION",
    );
  }

  const db = await loadDb();
  const idx = db.transactions.findIndex((t) => t.id === id);
  if (idx < 0) {
    return fail(args, `Not found: ${id}`, "ENOTFOUND");
  }
  const before = db.transactions[idx]!;
  const after: Transaction = { ...before };

  if (amountFlag !== undefined) {
    const n = typeof amountFlag === "string" ? Number(amountFlag) : NaN;
    if (!Number.isInteger(n) || n <= 0) {
      return fail(
        args,
        `--amount must be a positive integer: ${String(amountFlag)}`,
        "EVALIDATION",
      );
    }
    after.amount = n;
  }

  if (categoryFlag !== undefined) {
    if (typeof categoryFlag !== "string") {
      return fail(args, "--category requires a value", "EVALIDATION");
    }
    const r = resolveCategory(db.categories, categoryFlag);
    if (r.kind === "ambiguous") {
      return fail(args, `Ambiguous category: ${categoryFlag}`, "EAMBIGUOUS");
    }
    if (r.kind !== "ok") {
      return fail(args, `Unknown category: ${categoryFlag}`, "EVALIDATION");
    }
    if (r.category.type !== before.type) {
      return fail(
        args,
        `Category '${r.category.name}' is ${r.category.type}; transaction is ${before.type}. Delete and re-add to change type.`,
        "EVALIDATION",
      );
    }
    after.categoryId = r.category.id;
  }

  if (noteFlag !== undefined) {
    after.note = typeof noteFlag === "string" ? noteFlag : "";
  }

  if (dateFlag !== undefined) {
    const v = typeof dateFlag === "string" ? dateFlag : today();
    if (!isYmd(v)) {
      return fail(args, `Invalid date (expected YYYY-MM-DD): ${v}`, "EVALIDATION");
    }
    after.date = v;
  }

  const category = db.categories.find((c) => c.id === after.categoryId) ?? null;

  if (isDryRun(args)) {
    if (isJson(args)) okJson({ dry_run: true, would: { before, after, category } });
    else process.stdout.write(`[dry-run] would update ${id}\n`);
    return 0;
  }

  db.transactions[idx] = after;
  await saveDb(db);

  if (isJson(args)) {
    okJson({ before, after, category });
    return 0;
  }

  const signed = after.type === "income" ? after.amount : -after.amount;
  const noteSeg = after.note ? ` · ${after.note}` : "";
  process.stdout.write(
    `✓ Updated: ${after.id} → ${money(signed, { signed: true })} · ${category?.name ?? after.categoryId}${noteSeg} · ${after.date}\n`,
  );
  return 0;
};
