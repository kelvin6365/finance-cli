import { money } from "../core/format.ts";
import { loadDb } from "../core/storage.ts";
import type {
  Category,
  Database,
  Debt,
  PeriodicItem,
  RecurringExpense,
  RecurringIncome,
  Transaction,
} from "../core/types.ts";
import type { ParsedArgs } from "./argv.ts";
import { fail, isJson, okJson } from "./output.ts";

type Found =
  | { kind: "transaction"; entity: Transaction }
  | { kind: "debt"; entity: Debt }
  | { kind: "recurringIncome"; entity: RecurringIncome }
  | { kind: "recurringExpense"; entity: RecurringExpense }
  | { kind: "periodic"; entity: PeriodicItem }
  | { kind: "category"; entity: Category };

const findById = (db: Database, id: string): Found | null => {
  for (const t of db.transactions) if (t.id === id) return { kind: "transaction", entity: t };
  for (const d of db.debts) if (d.id === id) return { kind: "debt", entity: d };
  for (const r of db.recurringIncome) if (r.id === id) return { kind: "recurringIncome", entity: r };
  for (const r of db.recurringExpense) if (r.id === id) return { kind: "recurringExpense", entity: r };
  for (const p of db.periodicItems) if (p.id === id) return { kind: "periodic", entity: p };
  for (const c of db.categories) if (c.id === id) return { kind: "category", entity: c };
  return null;
};

const printHuman = (found: Found, category: Category | null): string[] => {
  const lines: string[] = [];
  lines.push(`Kind: ${found.kind}`);
  lines.push(`Id:   ${found.entity.id}`);
  switch (found.kind) {
    case "transaction": {
      const t = found.entity;
      lines.push(`Date:     ${t.date}`);
      lines.push(`Type:     ${t.type}`);
      lines.push(`Amount:   ${money(t.amount)}`);
      lines.push(`Category: ${category?.name ?? t.categoryId}`);
      if (t.note) lines.push(`Note:     ${t.note}`);
      break;
    }
    case "debt": {
      const d = found.entity;
      lines.push(`Name:       ${d.name}`);
      lines.push(`Principal:  ${money(d.principalRemaining)}`);
      lines.push(`Monthly:    ${money(d.monthlyPayment)}`);
      lines.push(`Rate:       ${d.annualRate}% p.a.`);
      lines.push(`Active:     ${d.active}`);
      if (d.note) lines.push(`Note:       ${d.note}`);
      break;
    }
    case "recurringIncome":
    case "recurringExpense": {
      const r = found.entity;
      lines.push(`Name:    ${r.name}`);
      lines.push(`Amount:  ${money(r.amount)}/mo`);
      lines.push(`Active:  ${r.active}`);
      if (r.note) lines.push(`Note:    ${r.note}`);
      break;
    }
    case "periodic": {
      const p = found.entity;
      lines.push(`Name:      ${p.name}`);
      lines.push(`Amount:    ${money(p.amount)}`);
      lines.push(`Type:      ${p.type}`);
      lines.push(`Month:     ${p.month}`);
      lines.push(`Recurring: ${p.recurring}`);
      lines.push(`Active:    ${p.active}`);
      if (p.note) lines.push(`Note:      ${p.note}`);
      break;
    }
    case "category": {
      const c = found.entity;
      lines.push(`Name:  ${c.name}`);
      lines.push(`Type:  ${c.type}`);
      lines.push(`Color: ${c.color}`);
      break;
    }
  }
  return lines;
};

export const runShow = async (args: ParsedArgs): Promise<number> => {
  const id = args.positional[0];
  if (!id) {
    return fail(args, "Usage: finance show <id>", "EVALIDATION");
  }
  const db = await loadDb();
  const found = findById(db, id);
  if (!found) {
    return fail(args, `Not found: ${id}`, "ENOTFOUND");
  }

  let category: Category | null = null;
  if (found.kind !== "category") {
    category = db.categories.find((c) => c.id === found.entity.categoryId) ?? null;
  }

  if (isJson(args)) {
    okJson({ kind: found.kind, entity: found.entity, category });
    return 0;
  }

  const lines = printHuman(found, category);
  process.stdout.write(`${lines.join("\n")}\n`);
  return 0;
};
