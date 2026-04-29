import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import seedJson from "../../data/seed.json" with { type: "json" };
import { dataPath } from "../core/storage.ts";
import type { ParsedArgs } from "./argv.ts";
import { isJson, okJson } from "./output.ts";

export const runInit = async (args: ParsedArgs): Promise<number> => {
  const path = dataPath();
  const target = Bun.file(path);
  if (await target.exists()) {
    if (isJson(args)) okJson({ created: false, path });
    else process.stdout.write(`Already exists: ${path}\n`);
    return 0;
  }
  await mkdir(dirname(path), { recursive: true });
  await Bun.write(path, `${JSON.stringify(seedJson, null, 2)}\n`);
  if (isJson(args)) okJson({ created: true, path });
  else process.stdout.write(`Created: ${path}\n`);
  return 0;
};
