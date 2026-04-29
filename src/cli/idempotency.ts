import { mkdir, rename } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { ParsedArgs } from "./argv.ts";

const TTL_MS = 24 * 60 * 60 * 1000;

type Entry = { ts: number; payload: unknown };
type Store = Record<string, Entry>;

const homeDir = (): string => {
  const home = process.env["HOME"] ?? process.env["USERPROFILE"];
  if (!home) throw new Error("Cannot resolve home directory");
  return home;
};

const storePath = (): string =>
  join(homeDir(), ".finance", "idempotency.json");

const load = async (): Promise<Store> => {
  const file = Bun.file(storePath());
  if (!(await file.exists())) return {};
  try {
    return (await file.json()) as Store;
  } catch {
    return {};
  }
};

const persist = async (store: Store): Promise<void> => {
  const path = storePath();
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  await Bun.write(tmp, `${JSON.stringify(store, null, 2)}\n`);
  await rename(tmp, path);
};

export const idemKey = (args: ParsedArgs): string | null => {
  const v = args.flags["idempotency-key"];
  return typeof v === "string" && v.length > 0 ? v : null;
};

export const idemLookup = async (key: string): Promise<unknown | null> => {
  const store = await load();
  const entry = store[key];
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL_MS) return null;
  return entry.payload;
};

export const idemSave = async (key: string, payload: unknown): Promise<void> => {
  const store = await load();
  const cutoff = Date.now() - TTL_MS;
  for (const k of Object.keys(store)) {
    const entry = store[k];
    if (entry && entry.ts < cutoff) delete store[k];
  }
  store[key] = { ts: Date.now(), payload };
  await persist(store);
};
