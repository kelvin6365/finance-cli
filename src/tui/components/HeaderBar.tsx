import { Box, Text } from "ink";

import { mayPrepHaveToday } from "../../core/calc.ts";
import { currentMonth, daysInMonth, monthName, today } from "../../core/date.ts";
import type { Database } from "../../core/types.ts";
import { BRAND } from "../branding.tsx";
import { palette } from "../theme.ts";

type Props = { db: Database };

export const HeaderBar = ({ db }: Props) => {
  const ymd = today();
  const ym = currentMonth();
  const [yearStr, monthStr] = ym.split("-") as [string, string];
  const day = Number(ymd.slice(8, 10));
  const dim = daysInMonth(ym);

  const have = mayPrepHaveToday(db, ymd);
  const target = db.settings.may2026InsuranceTarget;
  const ratio = target > 0 ? Math.max(0, Math.min(1, have / target)) : 0;
  const pct = Math.round(ratio * 100);
  const reserveColor =
    ratio >= 1 ? palette.positive : ratio < 0.5 ? palette.warning : palette.muted;

  return (
    <Box justifyContent="space-between">
      <Text bold color={palette.primary}>{BRAND.app}</Text>
      <Text color={palette.text}>
        {monthName(Number(monthStr))} {yearStr} · Day {day} / {dim}
      </Text>
      <Text color={reserveColor}>May ◯ {pct}%</Text>
    </Box>
  );
};
