import { monthBalanceActual } from "../core/calc.ts";
import { currentMonth, daysInMonth, monthName, today } from "../core/date.ts";
import { money } from "../core/format.ts";
import { loadDb } from "../core/storage.ts";
import type { ParsedArgs } from "./argv.ts";
import { isJson, okJson } from "./output.ts";

export const runBalance = async (args: ParsedArgs): Promise<number> => {
  const db = await loadDb();
  const ym = currentMonth();
  const balance = monthBalanceActual(db, ym);
  const day = Number(today().slice(8, 10));
  const daysRemaining = daysInMonth(ym) - day;

  if (isJson(args)) {
    okJson({ month: ym, balance, daysRemaining });
    return 0;
  }

  if (args.flags["raw"] === true) {
    process.stdout.write(`${balance}\n`);
    return 0;
  }

  const monthNum = Number(ym.slice(5));
  process.stdout.write(
    `Balance: ${money(balance, { signed: true })} · ${daysRemaining} days left in ${monthName(monthNum)}\n`,
  );
  return 0;
};
