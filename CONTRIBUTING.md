# Contributing

Thanks for your interest. This project is small and opinionated — please skim
the references before opening a PR.

## Read first

- [`README.md`](README.md) — what the tool does and how to install
- [`SPEC.md`](SPEC.md) — data model and command UX (source of truth)
- [`CLAUDE.md`](CLAUDE.md) — coding conventions, prohibitions, file layout

## Develop

Requires [Bun](https://bun.sh) ≥ 1.2.

```bash
bun install
bun run dev               # run the CLI from source
bun run typecheck         # tsc --noEmit, must pass
bun test                  # 114 tests across 7 files, must stay green
bun run build:macos-arm   # produce a binary for your platform
```

## Pull requests

- Keep changes focused; one concern per PR.
- For anything touching > 2 files, drop a design doc in
  `docs/plans/YYYY-MM-DD-topic-design.md` first.
- Typecheck and tests must pass.
- No new top-level dependencies without discussion.
- Don't modify `data/seed.json` — tests assert against its totals.

## Reporting bugs

Open an issue with:
- Your OS + Bun version (`bun --version`) or which release binary you used
- Output of `finance status --json` (redact amounts if you like — the shape
  is what matters)
- Steps to reproduce

## License

By contributing, you agree your work is licensed under the MIT License — see
[`LICENSE`](LICENSE).
