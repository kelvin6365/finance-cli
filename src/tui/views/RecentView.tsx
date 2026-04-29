import { Box, Text, useInput } from "ink";
import { useState } from "react";

import { money } from "../../core/format.ts";
import type { Database, Transaction } from "../../core/types.ts";
import { palette } from "../theme.ts";

type Props = { db: Database };

const PAGE_SIZE = 10;

const formatDate = (d: string): string => d; // already YYYY-MM-DD

const catName = (db: Database, id: string): string =>
  db.categories.find((c) => c.id === id)?.name ?? id;

const HEADER_WIDTHS = {
  date: 12,
  type: 8,
  amount: 10,
  category: 14,
  note: 20,
};

const Divider = () => (
  <Text color={palette.muted}>
    {"─".repeat(
      HEADER_WIDTHS.date +
        HEADER_WIDTHS.type +
        HEADER_WIDTHS.amount +
        HEADER_WIDTHS.category +
        HEADER_WIDTHS.note +
        4, // gaps
    )}
  </Text>
);

type RowProps = { txn: Transaction; db: Database; isSelected: boolean };

const Row = ({ txn, db, isSelected }: RowProps) => {
  const signed = money(txn.amount, { signed: txn.type === "income" });
  const amtColor = txn.type === "income" ? palette.positive : palette.negative;
  const label = isSelected ? "> " : "  ";

  return (
    <Box>
      <Text color={isSelected ? palette.primary : undefined}>{label}</Text>
      <Box width={HEADER_WIDTHS.date}>
        <Text>{formatDate(txn.date)}</Text>
      </Box>
      <Box width={HEADER_WIDTHS.type}>
        <Text color={palette.muted}>
          {txn.type === "income" ? "Income" : "Expense"}
        </Text>
      </Box>
      <Box width={HEADER_WIDTHS.amount} justifyContent="flex-end">
        <Text color={amtColor}>{signed}</Text>
      </Box>
      <Text>  </Text>
      <Box width={HEADER_WIDTHS.category}>
        <Text>{catName(db, txn.categoryId)}</Text>
      </Box>
      <Text color={palette.muted}>{txn.note}</Text>
    </Box>
  );
};

export const RecentView = ({ db }: Props) => {
  const sorted = [...db.transactions].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const [page, setPage] = useState(0);
  const [cursor, setCursor] = useState(0);

  const pageItems = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useInput((_input, key) => {
    if (key.upArrow || _input === "k") {
      setCursor((c) => Math.max(0, c - 1));
    } else if (key.downArrow || _input === "j") {
      setCursor((c) => Math.min(pageItems.length - 1, c + 1));
    } else if (_input === "n") {
      const next = Math.min(pageCount - 1, page + 1);
      setPage(next);
      setCursor(0);
    } else if (_input === "p") {
      const prev = Math.max(0, page - 1);
      setPage(prev);
      setCursor(0);
    }
  });

  return (
    <Box flexDirection="column" paddingY={1}>
      <Box justifyContent="space-between">
        <Text bold color={palette.primary}>
          RECENT TRANSACTIONS
        </Text>
        <Text color={palette.muted}>
          Page {page + 1}/{pageCount} · {total} total
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        {/* Header */}
        <Box>
          <Text>{"  "}</Text>
          <Box width={HEADER_WIDTHS.date}>
            <Text bold>Date</Text>
          </Box>
          <Box width={HEADER_WIDTHS.type}>
            <Text bold>Type</Text>
          </Box>
          <Box width={HEADER_WIDTHS.amount} justifyContent="flex-end">
            <Text bold>Amount</Text>
          </Box>
          <Text>{"  "}</Text>
          <Box width={HEADER_WIDTHS.category}>
            <Text bold>Category</Text>
          </Box>
          <Text bold>Note</Text>
        </Box>
        <Divider />

        {total === 0 ? (
          <Text color={palette.muted}>No transactions yet.</Text>
        ) : (
          pageItems.map((txn, i) => (
            <Row key={txn.id} txn={txn} db={db} isSelected={i === cursor} />
          ))
        )}
      </Box>

      <Box marginTop={1} gap={3}>
        <Text color={palette.muted}>[↑↓/jk] navigate</Text>
        <Text color={palette.muted}>[n/p] next/prev page</Text>
      </Box>
    </Box>
  );
};
