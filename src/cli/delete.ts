import { money } from "../core/format.ts";
import { error } from "../core/log.ts";
import { loadDb, saveDb } from "../core/storage.ts";
import type { ParsedArgs } from "./argv.ts";
import { fail, isJson, okJson } from "./output.ts";

const isTxId = (id: string): boolean =>
  id.startsWith("tx-") || id.startsWith("txn-");

const ask = (msg: string): string => {
  const answer = prompt(msg);
  return answer === null ? "" : answer.trim();
};

export const runDelete = async (args: ParsedArgs): Promise<number> => {
  const id = args.positional[0];
  if (!id) {
    return fail(args, "Usage: finance delete <id> [--yes]", "EVALIDATION");
  }
  if (!isTxId(id)) {
    return fail(
      args,
      `delete supports transactions only; for loans use 'finance loan' commands: ${id}`,
      "EVALIDATION",
    );
  }

  const db = await loadDb();
  const idx = db.transactions.findIndex((t) => t.id === id);
  if (idx < 0) {
    return fail(args, `Not found: ${id}`, "ENOTFOUND");
  }

  const tx = db.transactions[idx]!;
  const category = db.categories.find((c) => c.id === tx.categoryId) ?? null;

  // Confirm in human-interactive mode unless --yes was passed.
  // --json implies non-interactive (no prompt).
  if (!isJson(args) && args.flags["yes"] !== true) {
    if (!process.stdin.isTTY) {
      error(`Refusing to delete without --yes (no TTY): ${id}`);
      return 1;
    }
    const signed = tx.type === "income" ? tx.amount : -tx.amount;
    const noteSeg = tx.note ? ` · ${tx.note}` : "";
    const ans = ask(
      `Delete ${tx.date} · ${money(signed, { signed: true })} · ${category?.name ?? tx.categoryId}${noteSeg}? [y/N] `,
    );
    if (ans.toLowerCase() !== "y") {
      process.stdout.write("Cancelled.\n");
      return 0;
    }
  }

  db.transactions.splice(idx, 1);
  await saveDb(db);

  if (isJson(args)) {
    okJson({ deleted: tx, category });
    return 0;
  }

  process.stdout.write(`✓ Deleted: ${tx.id}\n`);
  return 0;
};
