import { Badge, ProgressBar } from "@inkjs/ui";
import { Box, Text } from "ink";

import {
  activeDebtCount,
  daysUntilMay2026,
  loanPayoff,
  mayPrepHaveToday,
  monthBalanceActual,
  monthIncomeActual,
  totalDebtRemaining,
} from "../../core/calc.ts";
import { currentMonth, daysInMonth, today } from "../../core/date.ts";
import { money, percent, truncate } from "../../core/format.ts";
import type { Database } from "../../core/types.ts";
import { Card } from "../components/Card.tsx";
import { MoneyText } from "../components/MoneyText.tsx";
import { palette } from "../theme.ts";

type Props = { db: Database };

const catName = (db: Database, id: string): string =>
  db.categories.find((c) => c.id === id)?.name ?? id;

const ratioOf = (n: number, d: number): number => (d > 0 ? n / d : 0);
const pct100 = (r: number): number =>
  Math.max(0, Math.min(100, Math.round(r * 100)));

type PaymentItem = { name: string; amount: number };

const ObligationRow = ({ item }: { item: PaymentItem }) => (
  <Box>
    <Box width={22}>
      <Text>{truncate(item.name, 21)}</Text>
    </Box>
    <Box width={9} justifyContent="flex-end">
      <Text color={palette.negative}>{money(item.amount)}</Text>
    </Box>
  </Box>
);

export const DashboardView = ({ db }: Props) => {
  const ymd = today();
  const ym = currentMonth();
  const day = Number(ymd.slice(8, 10));
  const dim = daysInMonth(ym);

  const incomeAct = monthIncomeActual(db, ym);
  const balance = monthBalanceActual(db, ym);
  const daysLeft = dim - day;

  const debt = totalDebtRemaining(db);
  const debtCount = activeDebtCount(db);

  const finishLine = db.debts
    .filter((d) => d.active)
    .map((d) => ({ debt: d, payoff: loanPayoff(d, ymd) }))
    .filter((x): x is { debt: typeof x.debt; payoff: NonNullable<typeof x.payoff> } => x.payoff !== null)
    .sort((a, b) => a.payoff.daysRemaining - b.payoff.daysRemaining)
    .slice(0, 3);

  const have = mayPrepHaveToday(db, ymd);
  const target = db.settings.may2026InsuranceTarget;
  const need = Math.max(0, target - have);
  const readiness = ratioOf(have, target);
  const daysLeftMay = daysUntilMay2026(db, ymd);
  const mayBorder = readiness < 0.5 ? palette.warning : undefined;

  const incomeItems = db.transactions
    .filter((t) => t.type === "income" && t.date.startsWith(ym))
    .sort((a, b) => b.amount - a.amount);

  const obligations: PaymentItem[] = [
    ...db.recurringExpense
      .filter((r) => r.active)
      .map((r) => ({ name: r.name, amount: r.amount })),
    ...db.debts
      .filter((d) => d.active)
      .map((d) => ({ name: d.name, amount: d.monthlyPayment })),
  ].sort((a, b) => b.amount - a.amount);

  const totalDue = obligations.reduce((s, o) => s + o.amount, 0);
  const leftCol = obligations.filter((_, i) => i % 2 === 0);
  const rightCol = obligations.filter((_, i) => i % 2 === 1);

  return (
    <Box flexDirection="column">
      <Card title="Income">
        {incomeItems.length === 0 ? (
          <Text dimColor>No income logged this month</Text>
        ) : (
          incomeItems.map((t) => (
            <Box key={t.id}>
              <Box width={22}>
                <Text>{truncate(catName(db, t.categoryId), 21)}</Text>
              </Box>
              <Box width={10} justifyContent="flex-end">
                <MoneyText value={t.amount} signed />
              </Box>
              <Text dimColor>  {t.note ? truncate(t.note, 15) : t.date}</Text>
            </Box>
          ))
        )}
        <Box marginTop={1}>
          <Box width={22}><Text bold>Received so far</Text></Box>
          <Box width={10} justifyContent="flex-end">
            <MoneyText value={incomeAct} signed bold />
          </Box>
        </Box>
        <Box>
          <Box width={22}><Text>Balance</Text></Box>
          <Box width={10} justifyContent="flex-end">
            <MoneyText value={balance} signed bold />
          </Box>
          <Text dimColor>  {daysLeft} days left</Text>
        </Box>
      </Card>

      <Box marginTop={1}>
        <Card title={`This Month  (${money(totalDue)} due)`}>
          {leftCol.map((item, i) => (
            <Box key={item.name}>
              <Box width={33}>
                <ObligationRow item={item} />
              </Box>
              <Box width={33}>
                {rightCol[i] ? <ObligationRow item={rightCol[i]} /> : null}
              </Box>
            </Box>
          ))}
        </Card>
      </Box>

      {finishLine.length > 0 ? (
        <Box marginTop={1}>
          <Card title="Loan finish line">
            {finishLine.map(({ debt: d, payoff }) => (
              <Box key={d.id}>
                <Box width={24}>
                  <Text>{truncate(d.name, 23)}</Text>
                </Box>
                <Box width={12}>
                  <Text color={palette.muted}>{payoff.endDate}</Text>
                </Box>
                <Text color={palette.muted}>  ({payoff.daysRemaining}d)</Text>
              </Box>
            ))}
          </Card>
        </Box>
      ) : null}

      <Box marginTop={1}>
        <Box marginRight={2}>
          <Card title="Total Debt">
            <Text bold color={palette.muted}>{money(debt)}</Text>
            <Text dimColor>{debtCount} active loan{debtCount === 1 ? "" : "s"}</Text>
          </Card>
        </Box>
        <Card title="May 2026 Insurance" borderColor={mayBorder}>
          <Box>
            <Text>{daysLeftMay} days left  </Text>
            {need > 0 ? (
              <Badge color="yellow">Behind</Badge>
            ) : (
              <Badge color="green">Funded</Badge>
            )}
          </Box>
          {need > 0 ? <Text>Need <MoneyText value={need} /> more</Text> : null}
          <Box>
            <Box width={14} marginRight={1}>
              <ProgressBar value={pct100(readiness)} />
            </Box>
            <Text>{percent(readiness)}</Text>
          </Box>
        </Card>
      </Box>
    </Box>
  );
};
