# Changelog

All notable changes to finance-cli are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows
[SemVer](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-04-29

First public release. Stable command surface, JSON envelope schema, and
single-binary distribution.

### Added — v0.5 interop
- `finance export [--format hledger] [--output PATH]` emits a plain-text
  journal of every transaction.
- `finance diff <YYYY-MM-DD>` reports activity from that date to today
  (income, expense, net, top categories).

### Added — v0.4 debt mastery
- `finance simulate --extra N --strategy avalanche|snowball` compares
  baseline vs strategy with month-by-month iteration, returning months
  saved and interest saved.
- `finance loans --json` envelope now embeds per-loan amortization
  (next-payment principal/interest split + total remaining interest).

### Added — v0.3 the wedge
- `finance afford <amount> [--by YYYY-MM-DD]` projects scheduled income
  vs obligations and answers yes / tight / no with shortfall and min
  running balance.
- `finance runway [--through YYYY-MM-DD]` combines this-month freelance
  vs target with a cashflow projection and emits a single
  push / coast / behind verdict.
- `finance recurring sync [--month YYYY-MM]` idempotently auto-creates
  transactions from recurring income/expense schedules.

### Added — v0.2 agent-friendly
- `finance schema --json` self-describes the command surface so LLMs can
  discover capabilities at runtime.
- `--dry-run` available on every mutation (init, add, edit, delete,
  loan add|edit|pay, income edit, recurring sync).
- `--idempotency-key <KEY>` on add / edit / delete / loan add|pay
  dedupes retries within 24h via `~/.finance/idempotency.json`.
- Every JSON envelope now carries `schema_version: "1.0"`.

### Added — v0.1 initial release
- Bun + TypeScript, single-binary distribution for macOS (arm64/x64),
  Linux x64, Windows x64.
- Core: types, atomic JSON storage, calc, format, log, date helpers.
- CLI: init, status, add, edit, delete, show, list, balance, income,
  income edit, recurring, categories, loans, loan add|edit|pay,
  next-month. Every command supports `--json`.
- TUI: 5-tab Ink dashboard (Dashboard / Add / Recent / Debts / Next
  Month) with Hermes-flavoured gold-on-dark palette, hero banner,
  light/dark auto-detect via `FINANCE_TUI_*` env vars.
- Per-loan payoff date and days-remaining (stored or amortised).
- May 2026 insurance reserve countdown with progress bar and
  Funded/Behind badge.
- Single configurable currency (`settings.currency` ISO code +
  `settings.currencySymbol`); defaults to USD in the public seed,
  override at `init` with `--currency`/`--symbol`.
- 128 tests across 9 files (core, CLI envelope, argv, category resolver,
  amortization, projection).

[1.0.0]: https://github.com/kelvin6365/finance-cli/releases/tag/v1.0.0
