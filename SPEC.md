# Finance Tracker · Specification

This document is the source of truth for what the tool does. If `CLAUDE.md` and `SPEC.md` ever conflict, fix one of them — never silently diverge.

---

## 1. Problem

User's real pains, in their words:

1. **「成日唔記得每個月要支出既錢係幾多 → 用多咗」** — forgets fixed monthly outflows, ends up overspending.
2. **「想知 in vs out balance」** — wants to see if income covers expenses; if not, they push freelance harder.
3. **「要易啲 mark 低支入支出 放便日常用」** — daily logging must be fast.

Two more pains shape the design (from their financial document):

4. A **lump-sum HK$83,400 insurance bill due May 2026**. The tool must expose a countdown + readiness percentage.
5. The user's **freelance income** is the lever they can pull. A separate `freelance` view matters.

---

## 2. Roadmap

### Shipped — v0.1 (initial public release)

| Milestone | Scope | Status |
|---|---|---|
| B1 | Project scaffold (Bun, TS, dirs, configs) | ✅ done |
| B2 | Core layer (types, storage, calc, format, log) | ✅ done |
| B3 | One-shot CLI commands (init, status, add, edit, delete, balance, income, list, loan/loans, recurring, categories, show, next-month) | ✅ done |
| B4 | Tests for core + CLI envelope (114 tests across 7 files) | ✅ done |
| B5 | README + cross-platform `bun build --compile` | ✅ done |
| 2B | Full-screen Ink TUI — 5 tabs (Dashboard / Add / Recent / Debts / Next Month), Hermes-style gold-on-dark theme, hero banner, light/dark detect | ✅ done |
| 2C-1 | May 2026 insurance countdown card with progress + Funded/Behind badge | ✅ done |
| 2C-2 | Per-loan payoff date + days-remaining (stored or amortised) | ✅ done |
| OSS | MIT license, CONTRIBUTING.md, CI workflow, single configurable currency | ✅ done |

### Planned

| Phase | Scope | Effort |
|---|---|---|
| ~~v0.2 — agent-friendly~~ | `finance schema --json` introspection · `--dry-run` on every mutation · `--idempotency-key` on add/edit/delete/loan add|pay (24h dedupe) · `schema_version` in every envelope | ✅ shipped |
| ~~v0.3 — the wedge~~ | `finance afford <amount> [--by YYYY-MM-DD]` (yes/tight/no) · `finance runway` (freelance vs target + cashflow projection + push/coast/behind verdict) · `finance recurring sync` (idempotent monthly auto-add) | ✅ shipped |
| ~~v0.4 — debt mastery~~ | `finance simulate --extra N --strategy avalanche\|snowball` (months + interest saved vs baseline) · `finance loans` JSON now embeds per-loan amortization (next-payment principal/interest split + total remaining interest) | ✅ shipped |
| **v0.5 — interop** | hledger-compatible plain-text export · `finance diff <date>` snapshot diffing | S |
| **v1.0** | docs polish, release binaries on tagged versions, signed releases | S |

### Deferred / non-goals (do not pursue)

- Double-entry accounting (beancount/ledger path) — wrong audience
- YNAB-style envelope budgeting — competes with the "log fast" wedge
- Bank sync / Plaid — local-only is a feature
- Web UI — premature; nail agent-CLI positioning first

Effort key: **S** ≈ ½ day, **M** ≈ 1–2 days, **L** ≈ 3+ days.

---

## 3. Data model

All amounts are **HKD integers**. All dates are **ISO `YYYY-MM-DD`** strings.

```ts
type Category = {
  id: string;            // e.g. "cat-food"
  type: "income" | "expense";
  name: string;          // e.g. "飲食"
  color: string;         // hex; used by future UI
};

type RecurringIncome = {
  id: string;
  name: string;
  amount: number;
  categoryId: string;
  dayOfMonth: number | null;  // null = user enters manually
  active: boolean;
  note: string;
};

type RecurringExpense = {
  id: string;
  name: string;
  amount: number;
  categoryId: string;
  dayOfMonth: number;
  active: boolean;
  note: string;
};

type Debt = {
  id: string;
  name: string;
  principalRemaining: number;
  annualRate: number;          // 12.68 means 12.68% APR
  monthlyPayment: number;
  startDate: string | null;
  endDate: string | null;      // null = open-ended (interest-only)
  categoryId: string;
  active: boolean;
  note: string;
};

type PeriodicItem = {
  id: string;
  name: string;
  amount: number;
  type: "income" | "expense";
  categoryId: string;
  month: number;               // 1–12
  recurring: "annual" | "once";
  active: boolean;
  note: string;
};

type Transaction = {
  id: string;
  date: string;                // YYYY-MM-DD
  amount: number;              // always positive; sign comes from `type`
  type: "income" | "expense";
  categoryId: string;
  note: string;
  recurringId?: string;        // links to a RecurringIncome/Expense if auto-generated
  createdAt: string;           // ISO timestamp
};

type Settings = {
  currency: string;            // ISO 4217 code (e.g. "USD", "HKD")
  currencySymbol: string;      // display prefix (e.g. "$", "HK$", "¥")
  monthlySavingsTarget: number;
  freelanceMonthlyTarget: number;
  livingExpenseTarget: number;
  currentReserve: number;
  may2026InsuranceTarget: number;
  may2026Deadline: string;     // YYYY-MM-DD
  weekStartsOn: 1;             // Monday
};

type Database = {
  _meta: { version: string; currency: string; description: string };
  settings: Settings;
  categories: Category[];
  recurringIncome: RecurringIncome[];
  recurringExpense: RecurringExpense[];
  debts: Debt[];
  periodicItems: PeriodicItem[];
  transactions: Transaction[];
};
```

Seed data is in `data/seed.json` and matches this shape exactly. Do not refactor the seed; refactor types to match seed if there's a mismatch (the seed reflects the user's real situation).

---

## 4. Storage

- File: `~/.finance/data.json` (`os.homedir()` resolves cross-platform).
- On `finance init`: copy `data/seed.json` to `~/.finance/data.json` if absent. Refuse to overwrite if it exists.
- Read: `JSON.parse(await Bun.file(path).text())`.
- Write: write to `~/.finance/data.json.tmp`, then `rename` to `data.json`. Atomic.
- Schema-version bumps must include a migration in `core/storage.ts`.

---

## 5. Computed metrics (`core/calc.ts`)

Pure functions. No I/O. Each takes a `Database` and returns a number / object.

```ts
monthlyIncomeTotal(db)         // sum of active recurringIncome.amount
monthlyExpenseTotal(db)        // sum of active recurringExpense.amount + active debts.monthlyPayment
monthlyNetCashflow(db)         // income - expense
totalDebtRemaining(db)         // sum of active debts.principalRemaining
daysUntilMay2026(db, today)    // days until settings.may2026Deadline
may2026Readiness(db, today)    // currentReserve + accumulated savings vs target → 0..1
monthIncomeActual(db, ym)      // sum of transactions in month ym, type=income
monthExpenseActual(db, ym)     // sum of transactions in month ym, type=expense
monthBalanceActual(db, ym)     // monthIncomeActual - monthExpenseActual
freelanceMonthActual(db, ym)   // sum of transactions in ym with categoryId="cat-freelance"
```

`ym` is `YYYY-MM`. `today` is injectable for testability (default = current date).

---

## 6. Commands (Phase B)

All commands print to stdout in plain text. No colors unless `process.stdout.isTTY`.

### `finance init`

Idempotent setup. Copies `data/seed.json` → `~/.finance/data.json` if absent. Prints the resolved path.

### `finance` / `finance status`

Default. Shows monthly snapshot:

```
─────────────────────────────────────────
  💰 2025年 12月 · Day 8 / 31
─────────────────────────────────────────
  收入            $5,000   (target $57,500)  ▓░░░░░░░░░  9%
  支出            $1,234   (預算 $55,948)    ▓░░░░░░░░░  2%
  本月 Balance    +$3,766
─────────────────────────────────────────
  總債務         $1,223,000
  5月保費距今     143 日   (準備度 23%)
─────────────────────────────────────────
```

Numbers shown:
- 收入 = `monthIncomeActual` for current month / target = `monthlyIncomeTotal`
- 支出 = `monthExpenseActual` / target = `monthlyExpenseTotal`
- Balance = `monthBalanceActual`
- 總債務 = `totalDebtRemaining`
- 5月保費距今 = `daysUntilMay2026` / readiness = `may2026Readiness * 100`

### `finance balance`

Single line:

```
Balance: +$3,766 · 12月仲剩 23 日
```

For pipe-friendly use, support `--raw` → just the integer.

### `finance income`

```
12月收入: $5,000 / target $57,500 (9%)
  Freelance: $0 / target $15,000 (push needed)
```

### `finance add`

Two modes:

**Interactive (no args):**
```
$ finance add
類型? (i)收入 / (e)支出: e
金額: 58
分類: [1] 飲食 [2] 交通 [3] 生活費 [4] 其他: 1
備註 (optional): 午餐
✓ Added: -$58 · 飲食 · 午餐 · 2025-12-08
```

**One-shot:**
```
$ finance add 58 food                 # default: expense, today
$ finance add 58 food "午餐"
$ finance add 1000 freelance --income
$ finance add 58 food --date 2025-12-07
```

Category arg can be the category `id` (`cat-food`), `name` (`飲食`), or shorthand (`food`). Implement a fuzzy lookup in `cli/category-resolver.ts`. Unknown category → list options and exit 1.

### `finance list`

Last 10 transactions by default:

```
日期        類型  金額       分類     備註
2025-12-08  支出  -$58       飲食     午餐
2025-12-08  收入  +$1,000    Freelance  Project A
...
```

Flags:
- `--month` → all transactions in the current month
- `--month 2025-11` → that specific month
- `-n 20` → custom limit
- `--type income` / `--type expense`
- `--category food`

---

## 7. CLI architecture

```
finance <command> [args] [flags]
```

`cli/index.ts` parses `process.argv`, dispatches. Use a **tiny hand-rolled parser** — do not add `commander` or `yargs`. The parser is ~40 lines and lives in `cli/argv.ts`.

Exit codes:
- `0` success
- `1` user error (bad args, unknown category)
- `2` system error (cannot read storage)

---

## 8. Out of scope for Phase B

Explicitly **not** in B:
- Editing or deleting transactions (only adding).
- Auto-generation of recurring transactions on month boundary.
- Full-screen Ink dashboard.
- Charts.
- Multi-account / multi-currency.
- Cloud sync.
- Web UI.

Anything in this list that surfaces during B → write it down in `PLAN.md` under "Phase 2 ideas" and move on.
