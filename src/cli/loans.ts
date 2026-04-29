import { money } from "../core/format.ts";
import { loadDb } from "../core/storage.ts";
import type { ParsedArgs } from "./argv.ts";
import { isJson, okJson } from "./output.ts";

const RULE = "─".repeat(56);

export const runLoans = async (args: ParsedArgs): Promise<number> => {
  const db = await loadDb();
  const debts = db.debts
    .filter((d) => d.active)
    .sort((a, b) => b.principalRemaining - a.principalRemaining);

  const totalPrincipal = debts.reduce((s, d) => s + d.principalRemaining, 0);
  const totalMonthly = debts.reduce((s, d) => s + d.monthlyPayment, 0);

  if (isJson(args)) {
    okJson({
      count: debts.length,
      totalPrincipal,
      totalMonthly,
      debts,
    });
    return 0;
  }

  const out: string[] = [];
  out.push(RULE);
  out.push(`  Active loans (${debts.length})`);
  out.push(RULE);
  for (const d of debts) {
    out.push(
      `  ${d.name.padEnd(30)}${money(d.principalRemaining).padStart(12)}  ${money(d.monthlyPayment).padStart(8)}/mo`,
    );
  }
  out.push(RULE);
  out.push(
    `  ${"Total".padEnd(30)}${money(totalPrincipal).padStart(12)}  ${money(totalMonthly).padStart(8)}/mo`,
  );
  out.push(RULE);
  process.stdout.write(`${out.join("\n")}\n`);
  return 0;
};
