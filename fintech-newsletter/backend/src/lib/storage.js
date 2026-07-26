// Flat JSON file storage, one file per day. Deliberately no separate index
// file: the briefs/ directory listing is the index, so there's nothing that
// can drift out of sync with it.
import fs from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const BRIEFS_DIR = path.join(DATA_DIR, "briefs");

async function ensureDirs() {
  await fs.mkdir(BRIEFS_DIR, { recursive: true });
}

function briefPath(date) {
  return path.join(BRIEFS_DIR, `${date}.json`);
}

export function emptyDay(date) {
  return { date, sections: {}, linkedin_angle: "", reflection_questions: [], top_cards: null };
}

export async function readDay(date) {
  await ensureDirs();
  try {
    return JSON.parse(await fs.readFile(briefPath(date), "utf-8"));
  } catch (err) {
    if (err.code === "ENOENT") return emptyDay(date);
    throw err;
  }
}

export async function writeDay(date, dayObj) {
  await ensureDirs();
  await fs.writeFile(briefPath(date), JSON.stringify(dayObj, null, 2));
}

export async function readAllBriefs() {
  await ensureDirs();
  const files = await fs.readdir(BRIEFS_DIR);
  const entries = await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map(async (f) => {
        const date = f.slice(0, -".json".length);
        const raw = await fs.readFile(path.join(BRIEFS_DIR, f), "utf-8");
        return [date, JSON.parse(raw)];
      }),
  );
  return Object.fromEntries(entries);
}

export async function deleteAllBriefs() {
  await ensureDirs();
  const files = await fs.readdir(BRIEFS_DIR);
  await Promise.all(
    files.filter((f) => f.endsWith(".json")).map((f) => fs.rm(path.join(BRIEFS_DIR, f))),
  );
}
