import { afford as projectAfford } from "../core/projection.ts";
import { daysInMonth, today } from "../core/date.ts";
import { money } from "../core/format.ts";
import { loadDb } from "../core/storage.ts";
import type { ParsedArgs } from "./argv.ts";
import { fail, isJson, okJson } from "./output.ts";

const isYmd = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s);

const endOfCurrentMonth = (ymd: string): string => {
  const ym = ymd.slice(0, 7);
  const dim = daysInMonth(ym);
  return `${ym}-${dim < 10 ? "0" : ""}${dim}`;
};

const verdictGlyph = (v: "yes" | "tight" | "no"): string =>
  v === "yes" ? "✅" : v === "tight" ? "⚠️ " : "❌";

export const runAfford = async (args: ParsedArgs): Promise<number> => {
  const amountStr = args.positional[0];
  if (!amountStr) {
    return fail(
      args,
      "Usage: finance afford <amount> [--by YYYY-MM-DD]",
      "EVALIDATION",
    );
  }
  const amount = Number(amountStr);
  if (!Number.isInteger(amount) || amount <= 0) {
    return fail(args, `Amount must be a positive integer: ${amountStr}`, "EVALIDATION");
  }

  const from = today();
  const byFlag = args.flags["by"];
  const to = typeof byFlag === "string" ? byFlag : endOfCurrentMonth(from);
  if (!isYmd(to)) {
    return fail(args, `Invalid --by date (expected YYYY-MM-DD): ${to}`, "EVALIDATION");
  }

  const db = await loadDb();
  const report = projectAfford(db, amount, from, to);

  if (isJson(args)) {
    okJson(report);
    return 0;
  }

  process.stdout.write(
    `${verdictGlyph(report.verdict)} ${report.verdict.toUpperCase()} — ${money(amount)} by ${to}\n`,
  );
  process.stdout.write(
    `  Net cashflow ${from} → ${to}: ${money(report.net_cashflow, { signed: true })}\n`,
  );
  process.stdout.write(
    `  Min running balance: ${money(report.min_running_balance, { signed: true })}` +
      (report.min_running_date ? ` (on ${report.min_running_date})` : "") +
      "\n",
  );
  if (report.shortfall > 0) {
    process.stdout.write(`  Shortfall: ${money(report.shortfall)}\n`);
  }
  if (report.verdict === "tight") {
    process.stdout.write(
      `  Cashflow gap before income arrives — bridge ${money(-report.min_running_balance)} to clear it.\n`,
    );
  }
  return 0;
};
