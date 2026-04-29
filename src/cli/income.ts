import {
  freelanceMonthActual,
  monthIncomeActual,
  monthlyIncomeTotal,
} from "../core/calc.ts";
import { currentMonth, monthName } from "../core/date.ts";
import { money, percent } from "../core/format.ts";
import { loadDb } from "../core/storage.ts";
import type { ParsedArgs } from "./argv.ts";
import { isJson, okJson } from "./output.ts";

export const runIncome = async (args: ParsedArgs): Promise<number> => {
  const db = await loadDb();
  const ym = currentMonth();
  const monthNum = Number(ym.slice(5));

  const actual = monthIncomeActual(db, ym);
  const target = monthlyIncomeTotal(db);
  const flAct = freelanceMonthActual(db, ym);
  const flTgt = db.settings.freelanceMonthlyTarget;
  const flStatus: "on track" | "push needed" =
    flTgt > 0 && flAct < flTgt ? "push needed" : "on track";

  if (isJson(args)) {
    okJson({
      month: ym,
      income: { actual, target },
      freelance: { actual: flAct, target: flTgt, status: flStatus },
    });
    return 0;
  }

  const ratio = (n: number, d: number): number => (d > 0 ? n / d : 0);
  process.stdout.write(
    `${monthName(monthNum)} income: ${money(actual)} / target ${money(target)} (${percent(ratio(actual, target))})\n`,
  );
  process.stdout.write(
    `  Freelance: ${money(flAct)} / target ${money(flTgt)} (${flStatus})\n`,
  );
  return 0;
};
