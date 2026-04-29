import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import seedJson from "../../data/seed.json" with { type: "json" };
import { dataPath, initFromSeed, loadDb, saveDb } from "./storage.ts";
import type { Database } from "./types.ts";

const seed = seedJson as Database;

let originalHome: string | undefined;
let tempHome: string;

beforeEach(async () => {
  originalHome = process.env["HOME"];
  tempHome = await mkdtemp(join(tmpdir(), "finance-test-"));
  process.env["HOME"] = tempHome;
});

afterEach(async () => {
  if (originalHome === undefined) delete process.env["HOME"];
  else process.env["HOME"] = originalHome;
  await rm(tempHome, { recursive: true, force: true });
});

describe("dataPath", () => {
  test("resolves under $HOME/.finance/data.json", () => {
    expect(dataPath()).toBe(join(tempHome, ".finance", "data.json"));
  });

  test("throws when neither HOME nor USERPROFILE set", () => {
    delete process.env["HOME"];
    delete process.env["USERPROFILE"];
    expect(() => dataPath()).toThrow();
  });
});

describe("saveDb / loadDb round-trip", () => {
  test("writes and reads back an identical fixture", async () => {
    const fixture: Database = {
      ...seed,
      transactions: [
        {
          id: "tx-1",
          date: "2025-12-08",
          amount: 58,
          type: "expense",
          categoryId: "cat-food",
          note: "Lunch",
          createdAt: "2025-12-08T03:00:00.000Z",
        },
      ],
    };
    await saveDb(fixture);
    const round = await loadDb();
    expect(round).toEqual(fixture);
  });

  test("saveDb creates parent directory if missing", async () => {
    await saveDb(seed);
    const file = Bun.file(dataPath());
    expect(await file.exists()).toBe(true);
  });

  test("saveDb is atomic (no .tmp file lingers after write)", async () => {
    await saveDb(seed);
    const tmp = Bun.file(`${dataPath()}.tmp`);
    expect(await tmp.exists()).toBe(false);
  });
});

describe("initFromSeed", () => {
  test("creates the data file when missing", async () => {
    const seedPath = join(tempHome, "seed.json");
    await writeFile(seedPath, JSON.stringify(seed));
    const result = await initFromSeed(seedPath);
    expect(result.created).toBe(true);
    expect(result.path).toBe(dataPath());
    const round = await loadDb();
    expect(round).toEqual(seed);
  });

  test("does not overwrite an existing data file", async () => {
    const fixture: Database = { ...seed, transactions: [] };
    await saveDb(fixture);
    const seedPath = join(tempHome, "seed.json");
    const otherSeed: Database = {
      ...seed,
      _meta: { ...seed._meta, description: "different" },
    };
    await writeFile(seedPath, JSON.stringify(otherSeed));
    const result = await initFromSeed(seedPath);
    expect(result.created).toBe(false);
    const round = await loadDb();
    expect(round._meta.description).toBe(fixture._meta.description);
  });

  test("throws when the seed file is missing", async () => {
    const missing = join(tempHome, "no-such-seed.json");
    await expect(initFromSeed(missing)).rejects.toThrow(/Seed file not found/);
  });
});
