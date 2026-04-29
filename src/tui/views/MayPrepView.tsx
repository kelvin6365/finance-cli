import { Box, Text } from "ink";

import { currentMonth, monthName } from "../../core/date.ts";
import { money } from "../../core/format.ts";
import type { Database } from "../../core/types.ts";
import { Card } from "../components/Card.tsx";
import { MoneyText } from "../components/MoneyText.tsx";
import { palette } from "../theme.ts";

type Props = { db: Database };

const nextYm = (): { ym: string; year: number; month: number } => {
  const [y, m] = currentMonth().split("-").map(Number) as [number, number];
  const month = m === 12 ? 1 : m + 1;
  const year = m === 12 ? y + 1 : y;
  return { ym: `${year}-${String(month).padStart(2, "0")}`, year, month };
};

export const MayPrepView = ({ db }: Props) => {
  const { year, month } = nextYm();

  // Income
  const incomeItems = db.recurringIncome
    .filter((r) => r.active)
    .sort((a, b) => b.amount - a.amount);
  const totalIncome = incomeItems.reduce((s, r) => s + r.amount, 0);

  // Regular payments (recurring expense + debts)
  const recurringItems = db.recurringExpense
    .filter((r) => r.active)
    .map((r) => ({ name: r.name, amount: r.amount }));
  const debtItems = db.debts
    .filter((d) => d.active)
    .map((d) => ({ name: d.name, amount: d.monthlyPayment }));
  const paymentItems = [...recurringItems, ...debtItems].sort(
    (a, b) => b.amount - a.amount,
  );
  const totalPayments = paymentItems.reduce((s, p) => s + p.amount, 0);

  // One-off items due next month
  const periodicDue = db.periodicItems.filter(
    (p) => p.active && p.month === month,
  );
  const totalPeriodic = periodicDue.reduce((s, p) => s + p.amount, 0);

  const net = totalIncome - totalPayments - totalPeriodic;

  return (
    <Box flexDirection="column" paddingY={1} gap={1}>
      <Text bold color={palette.primary}>
        NEXT MONTH · {monthName(month).toUpperCase()} {year}
      </Text>

      {/* Income */}
      <Card title="Income">
        {incomeItems.map((r) => (
          <Box key={r.id}>
            <Box flexGrow={1}><Text>{r.name}</Text></Box>
            <MoneyText value={r.amount} signed />
          </Box>
        ))}
        <Box marginTop={1}>
          <Box flexGrow={1}><Text bold>Total</Text></Box>
          <MoneyText value={totalIncome} signed bold />
        </Box>
      </Card>

      {/* Regular payments */}
      <Card title="Regular Payments">
        {paymentItems.map((p) => (
          <Box key={p.name}>
            <Box width={28}><Text>{p.name}</Text></Box>
            <Box justifyContent="flex-end" width={10}>
              <Text color={palette.negative}>{money(p.amount)}</Text>
            </Box>
          </Box>
        ))}
        <Box marginTop={1}>
          <Box width={28}><Text bold>Total</Text></Box>
          <Box justifyContent="flex-end" width={10}>
            <Text bold color={palette.negative}>{money(totalPayments)}</Text>
          </Box>
        </Box>
      </Card>

      {/* One-off payments due this month */}
      {periodicDue.length > 0 && (
        <Card title="One-off Due" borderColor={palette.warning}>
          {periodicDue.map((p) => (
            <Box key={p.id}>
              <Box flexGrow={1}><Text color={palette.warning}>{p.name}</Text></Box>
              <Text color={palette.warning}>{money(p.amount)}</Text>
            </Box>
          ))}
          <Box marginTop={1}>
            <Box flexGrow={1}><Text bold>Total</Text></Box>
            <Text bold color={palette.warning}>{money(totalPeriodic)}</Text>
          </Box>
        </Card>
      )}

      {/* Net */}
      <Card title="Net Balance">
        <Box>
          <Box flexGrow={1}><Text>Income</Text></Box>
          <MoneyText value={totalIncome} signed />
        </Box>
        <Box>
          <Box flexGrow={1}><Text>Regular expenses</Text></Box>
          <MoneyText value={-totalPayments} signed />
        </Box>
        {totalPeriodic > 0 && (
          <Box>
            <Box flexGrow={1}><Text>One-off</Text></Box>
            <MoneyText value={-totalPeriodic} signed />
          </Box>
        )}
        <Box marginTop={1}>
          <Box flexGrow={1}><Text bold>Net</Text></Box>
          <MoneyText value={net} signed bold />
        </Box>
      </Card>
    </Box>
  );
};
