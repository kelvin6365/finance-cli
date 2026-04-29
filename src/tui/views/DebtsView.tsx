import { Badge } from "@inkjs/ui";
import { Box, Text } from "ink";

import { loanPayoff } from "../../core/calc.ts";
import { today } from "../../core/date.ts";
import { money as fmt } from "../../core/format.ts";
import type { Database, Debt } from "../../core/types.ts";
import { palette } from "../theme.ts";

type Props = { db: Database };

const fmtRate = (rate: number): string =>
  rate === 0 ? "0%" : `${rate.toFixed(2)}%`;

type DebtRowProps = { debt: Debt; isHighRate: boolean; ymd: string };

const DebtRow = ({ debt, isHighRate, ymd }: DebtRowProps) => {
  const payoff = loanPayoff(debt, ymd);
  return (
    <Box>
      <Box width={24}>
        <Text>{debt.name}</Text>
      </Box>
      <Box width={14} justifyContent="flex-end">
        <Text>{fmt(debt.principalRemaining)}</Text>
      </Box>
      <Text>  </Text>
      <Box width={10}>
        {isHighRate ? (
          <Badge color="yellow">{fmtRate(debt.annualRate)}</Badge>
        ) : (
          <Text>{fmtRate(debt.annualRate)}</Text>
        )}
      </Box>
      <Box width={10} justifyContent="flex-end">
        <Text>{fmt(debt.monthlyPayment)}</Text>
      </Box>
      <Text>  </Text>
      <Box width={12}>
        {payoff ? (
          <Text color={palette.muted}>{payoff.endDate}</Text>
        ) : (
          <Badge color="gray">open</Badge>
        )}
      </Box>
      <Box width={11} justifyContent="flex-end">
        <Text color={palette.muted}>
          {payoff ? `${payoff.daysRemaining} days` : "—"}
        </Text>
      </Box>
    </Box>
  );
};

export const DebtsView = ({ db }: Props) => {
  const ymd = today();
  const activeDebts = db.debts
    .filter((d) => d.active)
    .sort((a, b) => b.principalRemaining - a.principalRemaining);

  const total = activeDebts.reduce((s, d) => s + d.principalRemaining, 0);

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box justifyContent="space-between">
        <Text bold color={palette.primary}>
          ACTIVE DEBTS
        </Text>
        <Text color={palette.muted}>Total: {fmt(total)}</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Box>
          <Box width={24}><Text bold>Name</Text></Box>
          <Box width={14} justifyContent="flex-end"><Text bold>Remaining</Text></Box>
          <Text>{"  "}</Text>
          <Box width={10}><Text bold>Rate</Text></Box>
          <Box width={10} justifyContent="flex-end"><Text bold>Monthly</Text></Box>
          <Text>{"  "}</Text>
          <Box width={12}><Text bold>Payoff</Text></Box>
          <Box width={11} justifyContent="flex-end"><Text bold>Days left</Text></Box>
        </Box>
        <Text color={palette.muted}>
          {"─".repeat(97)}
        </Text>

        {activeDebts.map((d) => (
          <DebtRow key={d.id} debt={d} isHighRate={d.annualRate >= 10} ymd={ymd} />
        ))}
      </Box>
    </Box>
  );
};
