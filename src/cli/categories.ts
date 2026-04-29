import { padRight } from "../core/format.ts";
import { loadDb } from "../core/storage.ts";
import type { ParsedArgs } from "./argv.ts";
import { isJson, okJson } from "./output.ts";

export const runCategories = async (args: ParsedArgs): Promise<number> => {
  const db = await loadDb();

  if (isJson(args)) {
    okJson(db.categories);
    return 0;
  }

  const out: string[] = [];
  out.push(`${padRight("Id", 20)} ${padRight("Type", 8)} Name`);
  for (const c of db.categories) {
    out.push(`${padRight(c.id, 20)} ${padRight(c.type, 8)} ${c.name}`);
  }
  process.stdout.write(`${out.join("\n")}\n`);
  return 0;
};
