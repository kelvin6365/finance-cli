import { simulatePayoff, type Strategy } from "../core/amortization.ts";
import { money } from "../core/format.ts";
import { loadDb } from "../core/storage.ts";
import type { ParsedArgs } from "./argv.ts";
import { fail, isJson, okJson } from "./output.ts";

const RULE = "─".repeat(60);

export const runSimulate = async (args: ParsedArgs): Promise<number> => {
  const extraFlag = args.flags["extra"];
  const extra = typeof extraFlag === "string" ? Number(extraFlag) : 0;
  if (!Number.isInteger(extra) || extra < 0) {
    return fail(args, `--extra must be a non-negative integer: ${String(extraFlag)}`, "EVALIDATION");
  }

  const stratFlag = args.flags["strategy"];
  const strategy: Strategy =
    stratFlag === "snowball" ? "snowball" : "avalanche";
  if (stratFlag !== undefined && stratFlag !== "avalanche" && stratFlag !== "snowball") {
    return fail(args, `--strategy must be 'avalanche' or 'snowball': ${String(stratFlag)}`, "EVALIDATION");
  }

  const db = await loadDb();
  const { baseline, strategy_run } = simulatePayoff(db, strategy, extra);
  const monthsSaved = baseline.months_to_clear_all - strategy_run.months_to_clear_all;
  const interestSaved = baseline.total_interest - strategy_run.total_interest;

  const report = {
    strategy,
    extra_per_month: extra,
    baseline,
    strategy_run,
    months_saved: monthsSaved,
    interest_saved: interestSaved,
  };

  if (isJson(args)) {
    okJson(report);
    return 0;
  }

  process.stdout.write(`${RULE}\n`);
  process.stdout.write(`  Debt payoff simulation · strategy=${strategy} · extra=${money(extra)}/mo\n`);
  process.stdout.write(`${RULE}\n`);
  process.stdout.write(
    `  Baseline:    ${baseline.months_to_clear_all} months · ${money(baseline.total_interest)} interest\n`,
  );
  process.stdout.write(
    `  Strategy:    ${strategy_run.months_to_clear_all} months · ${money(strategy_run.total_interest)} interest\n`,
  );
  process.stdout.write(`${RULE}\n`);
  process.stdout.write(
    `  Saved:       ${monthsSaved} months · ${money(interestSaved)} interest\n`,
  );
  process.stdout.write(`${RULE}\n`);
  if (extra > 0) {
    process.stdout.write(`  Per-loan order under ${strategy}:\n`);
    for (const l of strategy_run.per_loan) {
      process.stdout.write(
        `    ${l.name.padEnd(34)} cleared in ${String(l.months).padStart(3)} mo · int ${money(l.interest_paid)}\n`,
      );
    }
    process.stdout.write(`${RULE}\n`);
  }
  return 0;
};
