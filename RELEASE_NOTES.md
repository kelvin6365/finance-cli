# finance v1.0.0 — first public release

A terminal finance tracker for people getting out of debt, built first
for AI-agent use (every command supports `--json`).

Local. Offline. Single binary. No bank sync, no cloud, no envelopes.

## What it does

**Fast logging** — `finance add 80 food "lunch"` and you're done.

**Cashflow honesty** — `finance afford 5000 --by 2026-06-30` projects
scheduled income against recurring obligations and answers
**yes / tight / no** with a shortfall figure.

**Debt mastery** — `finance simulate --extra 5000 --strategy avalanche`
returns the months and interest you'd save vs your current trajectory.
`finance loans --json` gives you per-loan next-payment principal/interest
splits and total remaining interest until payoff.

**The freelance lever** — `finance runway` looks at this month's
freelance income vs your target and the cashflow window ahead, then
emits a single **PUSH / COAST / BEHIND** verdict.

## AI-agent friendly

- `finance schema --json` self-describes 19 commands and their flags
- `--dry-run` previews any mutation
- `--idempotency-key K` dedupes retries within 24h
- Every JSON envelope carries `schema_version: "1.0"` and a stable
  `{ ok, schema_version, data | error, code }` shape

## Other niceties

- 5-tab Ink TUI (Dashboard / Add / Recent / Debts / Next Month) with
  Hermes-flavoured gold-on-dark theme; `FINANCE_TUI_LIGHT=1` for light
  mode, auto-detect via `COLORFGBG`
- Single configurable currency — defaults to USD, override at `init`
  with `--currency HKD --symbol HK$`
- `finance export --format hledger` for the plain-text-accounting crowd
- `finance diff 2026-04-01` for "what changed since" reports
- `finance recurring sync` idempotently auto-creates monthly recurring
  transactions

## Install

Download the binary for your platform below, `chmod +x finance`, and
drop it on your `PATH`. No runtime dependencies — no Bun, no Node.

```bash
finance init        # create ~/.finance/data.json (USD default)
finance             # opens the TUI
finance --help      # full command list
```

## Stats

128 tests · 9 test files · 19 commands · MIT licensed
