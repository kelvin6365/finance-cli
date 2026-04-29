import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { loadDb } from "../core/storage.ts";
import type { Category, Database, Transaction } from "../core/types.ts";
import type { ParsedArgs } from "./argv.ts";
import { fail, isJson, okJson } from "./output.ts";

const accountFor = (cat: Category | undefined, fallback: string): string => {
  const name = (cat?.name ?? fallback).replace(/[:\s]+/g, "-");
  if (cat?.type === "income") return `Income:${name}`;
  return `Expenses:${name}`;
};

const ledgerLine = (
  tx: Transaction,
  cat: Category | undefined,
  symbol: string,
): string => {
  const account = accountFor(cat, tx.categoryId);
  const amount = `${symbol}${tx.amount}`;
  const desc = tx.note || cat?.name || tx.categoryId;
  if (tx.type === "expense") {
    return [
      `${tx.date} ${desc}`,
      `    ${account}                ${amount}`,
      `    Assets:Cash                -${amount}`,
    ].join("\n");
  }
  return [
    `${tx.date} ${desc}`,
    `    Assets:Cash                ${amount}`,
    `    ${account}                -${amount}`,
  ].join("\n");
};

const renderHledger = (db: Database): string => {
  const symbol = db.settings.currencySymbol;
  const cats = new Map(db.categories.map((c) => [c.id, c]));
  const txs = [...db.transactions].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );
  const lines: string[] = [
    `; finance-cli export · ${new Date().toISOString()}`,
    `; currency: ${db.settings.currency} (${symbol})`,
    "",
  ];
  for (const tx of txs) {
    lines.push(ledgerLine(tx, cats.get(tx.categoryId), symbol));
    lines.push("");
  }
  return lines.join("\n");
};

export const runExport = async (args: ParsedArgs): Promise<number> => {
  const fmtFlag = args.flags["format"];
  const format = typeof fmtFlag === "string" ? fmtFlag : "hledger";
  if (format !== "hledger") {
    return fail(args, `Unsupported --format: ${format} (try: hledger)`, "EVALIDATION");
  }

  const db = await loadDb();
  const body = renderHledger(db);

  const outFlag = args.flags["output"];
  if (typeof outFlag === "string") {
    await mkdir(dirname(outFlag), { recursive: true });
    await Bun.write(outFlag, body);
    if (isJson(args)) {
      okJson({ format, path: outFlag, transactions: db.transactions.length, bytes: body.length });
    } else {
      process.stdout.write(`✓ Exported ${db.transactions.length} transactions to ${outFlag}\n`);
    }
    return 0;
  }

  if (isJson(args)) {
    okJson({ format, transactions: db.transactions.length, body });
    return 0;
  }
  process.stdout.write(body);
  return 0;
};
