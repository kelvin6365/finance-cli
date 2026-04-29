# finance

[![CI](https://github.com/kelvin6365/finance-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/kelvin6365/finance-cli/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Bun](https://img.shields.io/badge/Bun-%E2%89%A51.2-black)](https://bun.sh)

A terminal finance tracker for people getting out of debt.
Local. Offline. Single binary. AI-agent friendly (`--json` on every command).

## Why this exists

Most personal finance tools optimise for *"where did my coffee money go?"*
This one optimises for *"can I make rent next month?"* — built for people
juggling several loans where monthly cashflow is tight.

Single-currency by design (set once in your data file). Default is USD;
override `settings.currency` and `settings.currencySymbol` to anything you
want — `HK$`, `¥`, `€`, `£`, `₹`, etc.

Three habits it supports in seconds:

- **Log a transaction** — `finance add 80 food`
- **See the real balance** — `finance balance`
- **Know what's coming** — `finance next-month` previews income vs payments
  *before* the month starts

## Install

### One-line install (macOS / Linux)

```bash
curl -fsSL https://raw.githubusercontent.com/kelvin6365/finance-cli/main/install.sh | bash
```

Detects your platform, downloads the latest release binary, and installs
to `/usr/local/bin/finance`. Override the location with
`INSTALL_DIR=$HOME/.local/bin`. No runtime dependencies — no Bun, no
Node, no Python.

### Bun users

If you have [Bun](https://bun.sh) ≥ 1.2 already:

```bash
bun add -g github:kelvin6365/finance-cli
```

This installs from source — runs your local Bun, no compile step.

### Manual download

Grab the binary for your platform from the
[Releases page](https://github.com/kelvin6365/finance-cli/releases/latest):

| Platform | Asset |
|---|---|
| macOS (Apple Silicon) | `finance-macos-arm64` |
| macOS (Intel)         | `finance-macos-x64`   |
| Linux x86_64          | `finance-linux-x64`   |
| Windows x86_64        | `finance-windows-x64.exe` |

Make it executable (`chmod +x finance-*`) and drop it on your `PATH`.

### From source

```bash
git clone https://github.com/kelvin6365/finance-cli
cd finance-cli
bun install
bun run build:macos-arm   # or build:macos-x64 / build:linux / build:windows
```

## First run

```bash
finance init                                 # creates ~/.finance/data.json (USD by default)
finance init --currency HKD --symbol HK$     # other currency at setup
finance                                      # opens the TUI on a TTY (5 tabs)
finance --help                               # full command list
```

Tab keys in the TUI: `1`–`5` switch, `Esc` returns to Dashboard, `q` quits.
On the Debts tab, `a` opens the add-loan form. On Recent, `j/k` move row, `n/p` move page.

The Debts tab and Dashboard show a **payoff date + days remaining** for each
loan — uses the stored end date when set, otherwise computes it from
amortisation. Loans whose payment can't cover interest show as `open`.

### Theming

The TUI ships a gold-on-dark palette (Hermes-flavoured). Override via env vars:

```bash
FINANCE_TUI_LIGHT=1 finance        # light palette
FINANCE_TUI_THEME=light finance    # same
FINANCE_TUI_NO_BANNER=1 finance    # skip launch banner
```

`COLORFGBG` is auto-detected (slots 7 / 15 trigger light mode).

## Common commands

### Daily

```bash
finance add 80 food "lunch"          # log a transaction
finance status                       # monthly snapshot
finance balance                      # one-line balance
finance list --month --type expense  # filtered transactions
finance edit <id> --amount 90        # fix a typo
finance delete <id>                  # remove (prompts unless --yes)
```

### Cashflow & projection

```bash
finance afford 5000                  # can I cover 5000 by end of month?
finance afford 50000 --by 2026-06-30 # by a specific date
finance runway                       # freelance vs target + push/coast/behind verdict
finance next-month                   # next-month income vs payments preview
```

### Loans & debt

```bash
finance loans                        # active debts + per-loan amortization (next split, remaining interest)
finance loan add --name "HSBC" --amount 50000 --instalments 24 --paid 3 --payment 2200
finance loan pay <id>                # record an instalment (decrements principal + logs txn)
finance simulate --extra 5000 --strategy avalanche
                                     # debt-payoff simulator: months + interest saved vs baseline
```

### Recurring & history

```bash
finance recurring                    # recurring income/expense/periodic
finance recurring sync               # auto-create transactions from recurring schedules (idempotent)
finance income                       # income vs target
finance diff 2026-04-01              # activity report from date to today
finance show <id>                    # universal lookup by id
finance categories                   # list categories
```

### AI-agent / interop

```bash
finance schema --json                # self-describe the command surface
finance export --format hledger      # plain-text journal mirror
finance export --output journal.txt
finance add 80 food --json --idempotency-key K  # safe to retry
finance loan pay <id> --dry-run --json          # preview without writing
```

Exit codes: `0` success · `1` validation/lookup error · `2` system error.

## Machine-readable mode

Every command supports `--json` for scripts and AI agents:

```bash
finance status --json | jq .balance
finance loans --json | jq '.totalPrincipal'
finance add 80 food "lunch" --json
```

The envelope is stable across releases:

```json
// success
{ "ok": true, "data": { ... } }

// error (stderr, non-zero exit)
{ "ok": false, "error": "...", "code": "ENOENT|ENOTFOUND|EVALIDATION|EAMBIGUOUS|EUNKNOWN" }
```

Edits and deletes return the *prior* state in their response, so wrappers
can offer "undo" without re-querying.

## Where your data lives

`~/.finance/data.json`. Plain JSON, atomic writes, easy to back up or
edit by hand. The tool never makes network requests.

To reset: `rm ~/.finance/data.json && finance init`.

## Non-goals

This tool intentionally does *not*:

- Sync to the cloud or talk to your bank
- Support multiple currencies or users
- Render charts, budget envelopes, or savings goals
- Run on mobile or web

If you want any of those, this isn't the right tool — and that's fine.

## License

MIT. See [LICENSE](LICENSE).
