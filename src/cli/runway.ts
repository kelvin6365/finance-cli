import { freelanceMonthActual } from "../core/calc.ts";
import { currentMonth, daysInMonth, today } from "../core/date.ts";
import { money } from "../core/format.ts";
import { afford } from "../core/projection.ts";
import { loadDb } from "../core/storage.ts";
import type { ParsedArgs } from "./argv.ts";
import { fail, isJson, okJson } from "./output.ts";

const isYmd = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s);

const endOfMonth = (ym: string): string => {
  const dim = daysInMonth(ym);
  return `${ym}-${dim < 10 ? "0" : ""}${dim}`;
};

type Recommendation = "push" | "coast" | "behind";

const recommendation = (gapToTarget: number, scheduledNet: number): Recommendation => {
  if (scheduledNet < 0) return "push";
  if (gapToTarget > 0) return "behind";
  return "coast";
};

export const runRunway = async (args: ParsedArgs): Promise<number> => {
  const ymd = today();
  const ym = currentMonth();

  const horizonFlag = args.flags["through"];
  const horizon = typeof horizonFlag === "string" ? horizonFlag : endOfMonth(ym);
  if (!isYmd(horizon)) {
    return fail(args, `Invalid --through date: ${horizon}`, "EVALIDATION");
  }

  const db = await loadDb();
  const freelanceActual = freelanceMonthActual(db, ym);
  const freelanceTarget = db.settings.freelanceMonthlyTarget;
  const gap = Math.max(0, freelanceTarget - freelanceActual);

  // Use afford() with amount=0 to get the bare cashflow projection
  const cashflow = afford(db, 0, ymd, horizon);
  const verdict = recommendation(gap, cashflow.net_cashflow);

  const report = {
    today: ymd,
    horizon,
    freelance: {
      actual_this_month: freelanceActual,
      target: freelanceTarget,
      gap_to_target: gap,
    },
    cashflow: {
      window: `${ymd} → ${horizon}`,
      net: cashflow.net_cashflow,
      min_balance: cashflow.min_running_balance,
      min_date: cashflow.min_running_date,
    },
    push_to_break_even: Math.max(0, -cashflow.net_cashflow),
    recommendation: verdict,
  };

  if (isJson(args)) {
    okJson(report);
    return 0;
  }

  process.stdout.write(`Runway report · ${ymd}\n\n`);
  process.stdout.write(`Freelance this month\n`);
  process.stdout.write(`  Earned:    ${money(freelanceActual)}\n`);
  process.stdout.write(`  Target:    ${money(freelanceTarget)}\n`);
  process.stdout.write(`  Gap:       ${money(gap)}\n\n`);
  process.stdout.write(`Cashflow ${ymd} → ${horizon}\n`);
  process.stdout.write(
    `  Net:       ${money(cashflow.net_cashflow, { signed: true })}\n`,
  );
  process.stdout.write(
    `  Min:       ${money(cashflow.min_running_balance, { signed: true })}` +
      (cashflow.min_running_date ? ` on ${cashflow.min_running_date}` : "") +
      "\n\n",
  );

  if (verdict === "push") {
    process.stdout.write(
      `→ PUSH — close ${money(report.push_to_break_even)} in extra freelance to break even.\n`,
    );
  } else if (verdict === "behind") {
    process.stdout.write(
      `→ BEHIND target by ${money(gap)}; cashflow is fine but freelance trailing.\n`,
    );
  } else {
    process.stdout.write(`→ COAST — on target and cashflow positive.\n`);
  }

  return 0;
};
