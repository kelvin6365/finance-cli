import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import seedJson from "../../data/seed.json" with { type: "json" };
import { dataPath } from "../core/storage.ts";
import type { Database } from "../core/types.ts";
import type { ParsedArgs } from "./argv.ts";
import { errJson, isJson, okJson } from "./output.ts";

const asString = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;

export const runInit = async (args: ParsedArgs): Promise<number> => {
  const path = dataPath();
  const target = Bun.file(path);
  if (await target.exists()) {
    if (isJson(args)) okJson({ created: false, path });
    else process.stdout.write(`Already exists: ${path}\n`);
    return 0;
  }

  const currency = asString(args.flags["currency"]);
  const symbol = asString(args.flags["symbol"]);
  if ((currency && !symbol) || (!currency && symbol)) {
    const msg = "Pass --currency and --symbol together (e.g. --currency HKD --symbol HK$)";
    if (isJson(args)) errJson(msg, "EVALIDATION");
    else process.stderr.write(`${msg}\n`);
    return 1;
  }

  const seed = seedJson as Database;
  const db: Database = currency && symbol
    ? {
        ...seed,
        _meta: { ...seed._meta, currency },
        settings: { ...seed.settings, currency, currencySymbol: symbol },
      }
    : seed;

  await mkdir(dirname(path), { recursive: true });
  await Bun.write(path, `${JSON.stringify(db, null, 2)}\n`);
  if (isJson(args)) okJson({ created: true, path, currency: db.settings.currency });
  else process.stdout.write(`Created: ${path} (${db.settings.currency})\n`);
  return 0;
};
