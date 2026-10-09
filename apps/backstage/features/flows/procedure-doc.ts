import { readdirSync } from "node:fs";
import path from "node:path";

const DATABASE_ROOT = path.join(process.cwd(), "content", "database");

const FOLDER_SLUG: Record<string, string> = {
  HRMS: "hrms",
  "HRMS-TRAINING": "hrms-training",
  "HRMS-SURVEY": "hrms-survey",
  HRMS_TRAVELNEXPENSE: "hrms-travelnexpense",
  "HRMS-RESOURCEALLOCATION": "hrms-resourceallocation",
  "HRM-TIMEPORT": "hrm-timeport",
  "HRMS-CRBBOOKING": "hrms-crbbooking",
  "HRMS-TranslationService": "hrms-translationservice",
  "HRMS-RewardNRecognition": "hrms-rewardnrecognition",
  "HRM-VMS": "hrm-vms",
};

export function databaseSlug(folder: string): string {
  return FOLDER_SLUG[folder] ?? folder.trim().toLowerCase();
}

export function procedureDocHref(
  databaseFolder: string,
  objectName: string,
  root = DATABASE_ROOT,
): string | null {
  const slug = databaseSlug(databaseFolder);
  const directory = path.join(root, slug);
  let names: string[];
  try {
    names = readdirSync(directory);
  } catch {
    return null;
  }
  const match = names.find((name) => name.toLowerCase() === `${objectName.toLowerCase()}.md`);
  if (!match) return null;
  const objectFile = match.slice(0, -3);
  return `/docs/database/${encodeURIComponent(slug)}/${encodeURIComponent(objectFile)}`;
}

export function isProcedureName(value: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
}
