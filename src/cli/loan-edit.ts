import { loadDb, saveDb } from "../core/storage.ts";
import type { Debt } from "../core/types.ts";
import type { ParsedArgs } from "./argv.ts";
import { asNonNegFloat, asNonNegInt, asPositiveInt, isYm } from "./loan.ts";
import { fail, isJson, okJson } from "./output.ts";

const EDIT_FLAGS = ["name", "payment", "principal", "rate", "end", "note"];

export const runLoanEdit = async (args: ParsedArgs): Promise<number> => {
  const id = args.positional[1];
  if (!id) {
    return fail(
      args,
      "Usage: finance loan edit <id> [--name] [--payment N] [--principal N] [--rate %] [--end YYYY-MM] [--note <text>]",
      "EVALIDATION",
    );
  }
  if (!id.startsWith("debt-")) {
    return fail(
      args,
      `loan edit requires a debt id (starts with 'debt-'): ${id}`,
      "EVALIDATION",
    );
  }

  if (EDIT_FLAGS.every((k) => args.flags[k] === undefined)) {
    return fail(
      args,
      "Nothing to update. Pass at least one of --name, --payment, --principal, --rate, --end, --note.",
      "EVALIDATION",
    );
  }

  const db = await loadDb();
  const idx = db.debts.findIndex((d) => d.id === id);
  if (idx < 0) return fail(args, `Not found: ${id}`, "ENOTFOUND");

  const before = db.debts[idx]!;
  const after: Debt = { ...before };

  const nameFlag = args.flags["name"];
  if (nameFlag !== undefined) {
    if (typeof nameFlag !== "string" || !nameFlag.trim()) {
      return fail(args, "--name requires a value", "EVALIDATION");
    }
    after.name = nameFlag.trim();
  }

  const paymentFlag = args.flags["payment"];
  if (paymentFlag !== undefined) {
    const n = asPositiveInt(paymentFlag);
    if (n === null) return fail(args, "--payment must be a positive integer", "EVALIDATION");
    after.monthlyPayment = n;
  }

  const principalFlag = args.flags["principal"];
  if (principalFlag !== undefined) {
    const n = asNonNegInt(principalFlag);
    if (n === null) return fail(args, "--principal must be a non-negative integer", "EVALIDATION");
    after.principalRemaining = n;
    if (n === 0) after.active = false;
  }

  const rateFlag = args.flags["rate"];
  if (rateFlag !== undefined) {
    const n = asNonNegFloat(rateFlag);
    if (n === null) return fail(args, "--rate must be a non-negative number", "EVALIDATION");
    after.annualRate = n;
  }

  const endFlag = args.flags["end"];
  if (endFlag !== undefined) {
    if (typeof endFlag !== "string") {
      return fail(args, "--end requires a YYYY-MM value", "EVALIDATION");
    }
    if (endFlag === "" || endFlag === "null") {
      after.endDate = null;
    } else if (!isYm(endFlag)) {
      return fail(args, "--end must be YYYY-MM format", "EVALIDATION");
    } else {
      after.endDate = endFlag;
    }
  }

  const noteFlag = args.flags["note"];
  if (noteFlag !== undefined) {
    after.note = typeof noteFlag === "string" ? noteFlag : "";
  }

  db.debts[idx] = after;
  await saveDb(db);

  if (isJson(args)) {
    okJson({ before, after });
    return 0;
  }
  process.stdout.write(`✓ Updated: ${after.id} · ${after.name}\n`);
  return 0;
};
