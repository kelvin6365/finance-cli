import { loanAmortization } from "../core/amortization.ts";
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

  const enriched = debts.map((d) => ({
    ...d,
    amortization: loanAmortization(d),
  }));

  if (isJson(args)) {
    okJson({
      count: debts.length,
      totalPrincipal,
      totalMonthly,
      totalRemainingInterest: enriched.reduce(
        (s, d) => s + d.amortization.totalInterestRemaining,
        0,
      ),
      debts: enriched,
    });
    return 0;
  }

  const out: string[] = [];
  out.push(RULE);
  out.push(`  Active loans (${debts.length})`);
  out.push(RULE);
  for (const d of enriched) {
    const next = d.amortization.nextPayment;
    const remI = d.amortization.totalInterestRemaining;
    out.push(
      `  ${d.name.padEnd(30)}${money(d.principalRemaining).padStart(12)}  ${money(d.monthlyPayment).padStart(8)}/mo`,
    );
    out.push(
      `    next: ${money(next.principal)} princ + ${money(next.interest)} int    remaining int: ${money(remI)}`,
    );
  }
  out.push(RULE);
  const totalRemI = enriched.reduce((s, d) => s + d.amortization.totalInterestRemaining, 0);
  out.push(
    `  ${"Total".padEnd(30)}${money(totalPrincipal).padStart(12)}  ${money(totalMonthly).padStart(8)}/mo`,
  );
  out.push(`  ${"Remaining interest".padEnd(30)}${money(totalRemI).padStart(12)}`);
  out.push(RULE);
  process.stdout.write(`${out.join("\n")}\n`);
  return 0;
};
