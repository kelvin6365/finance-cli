import { money } from "../core/format.ts";
import { loadDb, saveDb } from "../core/storage.ts";
import type { RecurringIncome } from "../core/types.ts";
import type { ParsedArgs } from "./argv.ts";
import { asPositiveInt } from "./loan.ts";
import { fail, isJson, okJson } from "./output.ts";

const EDIT_FLAGS = ["name", "amount", "note"];

export const runIncomeEdit = async (args: ParsedArgs): Promise<number> => {
  const id = args.positional[1];
  if (!id) {
    return fail(
      args,
      "Usage: finance income edit <id> [--name <s>] [--amount N] [--note <text>]",
      "EVALIDATION",
    );
  }
  if (!id.startsWith("rec-inc-")) {
    return fail(
      args,
      `income edit requires a recurring income id (starts with 'rec-inc-'): ${id}`,
      "EVALIDATION",
    );
  }

  if (EDIT_FLAGS.every((k) => args.flags[k] === undefined)) {
    return fail(
      args,
      "Nothing to update. Pass at least one of --name, --amount, --note.",
      "EVALIDATION",
    );
  }

  const db = await loadDb();
  const idx = db.recurringIncome.findIndex((r) => r.id === id);
  if (idx < 0) return fail(args, `Not found: ${id}`, "ENOTFOUND");

  const before = db.recurringIncome[idx]!;
  const after: RecurringIncome = { ...before };

  const nameFlag = args.flags["name"];
  if (nameFlag !== undefined) {
    if (typeof nameFlag !== "string" || !nameFlag.trim()) {
      return fail(args, "--name requires a value", "EVALIDATION");
    }
    after.name = nameFlag.trim();
  }

  const amountFlag = args.flags["amount"];
  if (amountFlag !== undefined) {
    const n = asPositiveInt(amountFlag);
    if (n === null) return fail(args, "--amount must be a positive integer", "EVALIDATION");
    after.amount = n;
  }

  const noteFlag = args.flags["note"];
  if (noteFlag !== undefined) {
    after.note = typeof noteFlag === "string" ? noteFlag : "";
  }

  db.recurringIncome[idx] = after;
  await saveDb(db);

  const category = db.categories.find((c) => c.id === after.categoryId) ?? null;

  if (isJson(args)) {
    okJson({ before, after, category });
    return 0;
  }
  process.stdout.write(
    `✓ Updated: ${after.id} · ${after.name} · ${money(after.amount)}/mo\n`,
  );
  return 0;
};
