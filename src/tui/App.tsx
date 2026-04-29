import { StatusMessage, ThemeProvider } from "@inkjs/ui";
import { Box, useApp, useInput, useStdout } from "ink";
import { useEffect, useState } from "react";

import type { Database } from "../core/types.ts";
import { Banner } from "./components/Banner.tsx";
import { Footer } from "./components/Footer.tsx";
import { HeaderBar } from "./components/HeaderBar.tsx";
import { TABS, TabBar } from "./components/TabBar.tsx";
import { theme } from "./theme.ts";
import { AddLoanView } from "./views/AddLoanView.tsx";
import { AddView } from "./views/AddView.tsx";
import { DashboardView } from "./views/DashboardView.tsx";
import { DebtsView } from "./views/DebtsView.tsx";
import { MayPrepView } from "./views/MayPrepView.tsx";
import { RecentView } from "./views/RecentView.tsx";

const MIN_COLUMNS = 80;
const BANNER_MS = 900;

const useColumns = (): number => {
  const { stdout } = useStdout();
  const [columns, setColumns] = useState<number>(stdout.columns ?? MIN_COLUMNS);
  useEffect(() => {
    const onResize = (): void => {
      setColumns(stdout.columns ?? MIN_COLUMNS);
    };
    stdout.on("resize", onResize);
    return () => {
      stdout.off("resize", onResize);
    };
  }, [stdout]);
  return columns;
};

type Props = {
  db: Database;
};

export const App = ({ db: initialDb }: Props) => {
  const [tabIndex, setTabIndex] = useState(0);
  const [db, setDb] = useState<Database>(initialDb);
  const [addingLoan, setAddingLoan] = useState(false);
  const [showBanner, setShowBanner] = useState(
    process.env.FINANCE_TUI_NO_BANNER !== "1",
  );
  const { exit } = useApp();
  const columns = useColumns();

  useEffect(() => {
    if (!showBanner) return;
    const id = setTimeout(() => setShowBanner(false), BANNER_MS);
    return () => clearTimeout(id);
  }, [showBanner]);

  const currentTabId = TABS[tabIndex]?.id;
  const onAddTab = currentTabId === "add";
  const onDebtsTab = currentTabId === "debts";
  const onRecentTab = currentTabId === "recent";
  const inputBlocked = onAddTab || addingLoan;

  useInput((input, key) => {
    if (key.escape) {
      if (addingLoan) { setAddingLoan(false); return; }
      setTabIndex(0);
      return;
    }
    if (inputBlocked) return;
    if (input === "q") {
      exit();
      return;
    }
    if (onDebtsTab && input === "a") {
      setAddingLoan(true);
      return;
    }
    const n = Number(input);
    if (Number.isInteger(n) && n >= 1 && n <= TABS.length) {
      setTabIndex(n - 1);
      setAddingLoan(false);
    }
  });

  if (columns < MIN_COLUMNS) {
    return (
      <ThemeProvider theme={theme}>
        <StatusMessage variant="warning">
          Widen the terminal to at least {MIN_COLUMNS} columns. Current:{" "}
          {columns}.
        </StatusMessage>
      </ThemeProvider>
    );
  }

  if (showBanner) {
    return (
      <ThemeProvider theme={theme}>
        <Banner />
      </ThemeProvider>
    );
  }

  const view = (() => {
    switch (TABS[tabIndex]?.id) {
      case "add":
        return (
          <AddView
            db={db}
            onSaved={(next) => {
              setDb(next);
              setTabIndex(0);
            }}
          />
        );
      case "recent":
        return <RecentView db={db} />;
      case "debts":
        return addingLoan ? (
          <AddLoanView
            db={db}
            onSaved={(next) => { setDb(next); setAddingLoan(false); }}
            onCancel={() => setAddingLoan(false)}
          />
        ) : (
          <DebtsView db={db} />
        );
      case "may-prep":
        return <MayPrepView db={db} />;
      case "dashboard":
      default:
        return <DashboardView db={db} />;
    }
  })();

  const hints =
    onAddTab || addingLoan
      ? [{ key: "Esc", label: "cancel" }]
      : [
          { key: "1-5", label: "switch view" },
          { key: "Esc", label: "dashboard" },
          ...(onDebtsTab ? [{ key: "a", label: "add loan" }] : []),
          ...(onRecentTab ? [{ key: "j/k", label: "move" }, { key: "n/p", label: "page" }] : []),
          { key: "q", label: "quit" },
        ];

  return (
    <ThemeProvider theme={theme}>
      <Box flexDirection="column">
        <HeaderBar db={db} />
        <Box marginTop={1}>
          <TabBar activeIndex={tabIndex} />
        </Box>
        <Box flexGrow={1} marginY={1}>
          {view}
        </Box>
        <Footer hints={hints} />
      </Box>
    </ThemeProvider>
  );
};
