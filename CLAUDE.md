# Finance Tracker

Personal finance CLI + TUI optimised for **fast daily transaction logging** and **at-a-glance monthly balance** — so a debt-juggling user knows when to push freelance work. Built first for AI-agent use (every command supports `--json`); also distributed publicly for general use.

## Tech stack

- **Runtime:** Bun (≥ 1.2). Do **not** use Node-specific APIs; prefer `Bun.*` and Web standard APIs.
- **Language:** TypeScript, strict mode.
- **Full-screen TUI:** Ink (`ink`, `ink-text-input`, `ink-select-input`).
- **TUI components:** `@inkjs/ui` (Spinner, ProgressBar, Badge, StatusMessage, Select, TextInput, ConfirmInput). Do not reach for ad-hoc third-party Ink packages — `@inkjs/ui` is the official set and covers our needs.
- **One-shot CLI:** plain `console` writes through `core/format.ts` — no Ink for short commands; keep startup under 50ms.
- **Storage:** one JSON file at `~/.finance/data.json` (atomic write via temp file + rename).
- **Distribution:** `bun build --compile` → single binary. Cross-platform: macOS (arm64 + x64), Linux x64, Windows x64.

## Project map

- `SPEC.md` — full feature spec, data model, command UX. Read before designing anything.
- `README.md` — user-facing setup. Do not duplicate its content elsewhere.
- `data/seed.json` — generic test fixture, also used by `finance init`. **Read-only**, do not modify; tests assert against its totals.
- `data/seed.local.json` — gitignored, holds the maintainer's real financial snapshot for local development. Safe to edit freely.
- `docs/plans/` — design docs for non-trivial features (filename `YYYY-MM-DD-topic-design.md`). Write one before any task touching > 2 files.
- `src/core/` — pure logic, no I/O or terminal dependencies. Reusable for future web UI.
- `src/cli/` — CLI entry + one-shot command handlers: `init`, `status`, `add`, `edit`, `delete`, `show`, `list`, `balance`, `income`, `income-edit`, `recurring`, `categories`, `loan` (+ `loan-edit`, `loan-pay`), `loans`, `next-month`. Every command supports `--json`.
- `src/tui/` — Ink full-screen TUI. Entry via `renderApp()` in `src/tui/index.ts`.

## TUI structure

```
src/tui/
├─ index.ts              renderApp(db) — called when finance runs with no args in a TTY
├─ App.tsx               root: tabIndex + db state, ThemeProvider, banner gate, key handling
├─ theme.ts              dark + light palettes, detectLightMode() (env-driven), extendTheme
├─ branding.tsx          BRAND constant: ◆ FINANCE, glyphs (❯ section, ┊ money, ▸ status)
├─ components/
│  ├─ HeaderBar.tsx      persistent: app mark · month/day · May reserve %
│  ├─ Footer.tsx         persistent context-aware key hints
│  ├─ Banner.tsx         hero shown ~900ms on launch (skip with FINANCE_TUI_NO_BANNER=1)
│  ├─ TabBar.tsx         5 tabs, active tab gets ❯ accent prefix + bold gold
│  ├─ Card.tsx           round-bordered box with ❯-prefixed title
│  ├─ MoneyText.tsx      colour-coded money + MoneyRow helper (┊ label  amount  note)
│  ├─ ProgressRow.tsx    label + bar + percentage
│  └─ KeyHint.tsx        [key] label hints
└─ views/
   ├─ DashboardView.tsx  income list, monthly obligations, Loan Finish-line top-3, debt summary, May insurance
   ├─ AddView.tsx        form: type → amount → category → note → confirm
   ├─ AddLoanView.tsx    modal launched from DebtsView (`a` key)
   ├─ RecentView.tsx     paginated transaction list, j/k row + n/p page navigation
   ├─ DebtsView.tsx      active debts sorted by principal desc, payoff date + days-remaining columns
   └─ MayPrepView.tsx    next month preview: income, payments, one-offs, net balance
```

Tab keys: `1`–`5` switch tabs, `Esc` returns to Dashboard (or cancels modal), `q` quits, `a` opens AddLoan from Debts.

### Theming env vars

- `FINANCE_TUI_LIGHT=1` — force light palette
- `FINANCE_TUI_THEME=light|dark` — explicit override
- `FINANCE_TUI_BACKGROUND=#hex` — auto-pick by background luminance
- `COLORFGBG` — auto-detected (slot 7 or 15 → light)
- `FINANCE_TUI_NO_BANNER=1` — skip launch banner

Default is dark with gold/amber accents.

## Workflow

1. For any task touching > 2 files, propose a plan first (use plan mode).
2. Implement → typecheck → test.
3. If a design decision is ambiguous and not covered in `SPEC.md`, ask the user via `AskUserQuestion` — do not guess.

## Conventions

- Currency: single, configurable per data file. `settings.currency` holds the ISO code; `settings.currencySymbol` is what `money()` prints. Default in the public `data/seed.json` is `USD` / `$`. Amounts are stored as integers (no cents). Don't reintroduce hard-coded currency literals; use `setCurrencySymbol()` (called by `loadDb`) plus the `symbol` option on `money()`.
- Dates: ISO 8601 strings (`YYYY-MM-DD`).
- File names: kebab-case (`add-transaction.ts`).
- Exports: named only, no default exports.
- Files: target ≤ 200 lines.
- User-facing strings: English. Code, comments, identifiers: English.
- Comments: explain why, never what.
- TUI views live in `src/tui/views/`. Shared TUI components in `src/tui/components/`. Theme in `src/tui/theme.ts`.

## Prohibited

- ❌ No `any`. Use `unknown` and narrow.
- ❌ No `console.log` in committed code. Route through `core/log.ts`.
- ❌ No new top-level dependencies without explicit user approval.
- ❌ Do not modify `data/seed.json`.
- ❌ Do not write user data anywhere except `~/.finance/`.
- ❌ No state-management libraries (Redux/Zustand). `useState` / `useReducer` only.
- ❌ No raw ANSI escape codes. Use `<Text color="...">` and Ink's color names.
- ❌ No `box-drawing` characters drawn by hand inside `<Text>`. Use `<Box borderStyle="single">` instead.
- ❌ Do not block the event loop in TUI views. All I/O goes through `useEffect`.
- ❌ Do not auto-update this file. Suggest edits to the user instead.

## Verification

After every code change:

```bash
bun run typecheck   # must pass
bun test            # 114 tests across 7 files; must stay green for files you touched
```

## When unsure

Open `SPEC.md` first. If the answer isn't there, ask the user one focused question. Never silently invent behaviour — financial code that guesses is worse than financial code that pauses.
