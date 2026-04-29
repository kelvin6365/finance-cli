import { mkdir, rename } from "node:fs/promises";
import { dirname, join } from "node:path";

import { setCurrencySymbol } from "./format.ts";
import type { Database } from "./types.ts";

const homeDir = (): string => {
  const home = process.env["HOME"] ?? process.env["USERPROFILE"];
  if (!home) {
    throw new Error("Cannot resolve home directory: $HOME / $USERPROFILE unset");
  }
  return home;
};

export const dataPath = (): string => join(homeDir(), ".finance", "data.json");

export const loadDb = async (): Promise<Database> => {
  const file = Bun.file(dataPath());
  const db = (await file.json()) as Database;
  if (db.settings?.currencySymbol) setCurrencySymbol(db.settings.currencySymbol);
  return db;
};

export const saveDb = async (db: Database): Promise<void> => {
  const path = dataPath();
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  await Bun.write(tmp, `${JSON.stringify(db, null, 2)}\n`);
  await rename(tmp, path);
};

export type InitResult = { created: boolean; path: string };

export const initFromSeed = async (seedPath: string): Promise<InitResult> => {
  const path = dataPath();
  const target = Bun.file(path);
  if (await target.exists()) {
    return { created: false, path };
  }
  await mkdir(dirname(path), { recursive: true });
  const seed = Bun.file(seedPath);
  if (!(await seed.exists())) {
    throw new Error(`Seed file not found: ${seedPath}`);
  }
  await Bun.write(path, await seed.text());
  return { created: true, path };
};
