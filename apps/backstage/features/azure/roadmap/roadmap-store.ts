import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  emptyRoadmap,
  ensureLaneColors,
  migrateRoadmapJson,
  RoadmapSchema,
  type Roadmap,
} from "@/features/azure/roadmap/roadmap";

export const ROADMAP_DIR_NAME = "_roadmap";
export const ROADMAP_FILE_NAME = "roadmap.json";

export const DEFAULT_ROADMAP_DIR = path.join(
  process.cwd(),
  "content",
  "azure",
  ROADMAP_DIR_NAME,
);

export const DEFAULT_ROADMAP_PATH = path.join(DEFAULT_ROADMAP_DIR, ROADMAP_FILE_NAME);

export function readRoadmap(filePath: string = DEFAULT_ROADMAP_PATH): Roadmap {
  if (!existsSync(filePath)) {
    return emptyRoadmap();
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    throw new Error("Roadmap file is not valid JSON");
  }
  const result = RoadmapSchema.safeParse(migrateRoadmapJson(parsed));
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Roadmap file is invalid");
  }
  const ensured = ensureLaneColors(result.data);
  if (ensured.changed) {
    writeRoadmap(ensured.roadmap, filePath);
  }
  return ensured.roadmap;
}

export function writeRoadmap(roadmap: Roadmap, filePath: string = DEFAULT_ROADMAP_PATH): void {
  const result = RoadmapSchema.safeParse(roadmap);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? "Roadmap file is invalid");
  }
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(result.data, null, 2)}\n`, "utf8");
}
