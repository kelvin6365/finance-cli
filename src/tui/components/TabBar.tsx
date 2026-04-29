import { Box, Text } from "ink";

import { palette } from "../theme.ts";

export type TabId =
  | "dashboard"
  | "add"
  | "recent"
  | "debts"
  | "may-prep";

export type Tab = {
  id: TabId;
  label: string;
};

export const TABS: readonly Tab[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "add", label: "Add" },
  { id: "recent", label: "Recent" },
  { id: "debts", label: "Debts" },
  { id: "may-prep", label: "Next Month" },
] as const;

type Props = {
  activeIndex: number;
};

export const TabBar = ({ activeIndex }: Props) => (
  <Box>
    {TABS.map((tab, i) => {
      const active = i === activeIndex;
      return (
        <Box key={tab.id} marginRight={2}>
          {active ? (
            <>
              <Text color={palette.accent}>❯ </Text>
              <Text bold color={palette.primary}>
                {i + 1} {tab.label}
              </Text>
            </>
          ) : (
            <Text color={palette.muted}>  {i + 1} {tab.label}</Text>
          )}
        </Box>
      );
    })}
  </Box>
);
