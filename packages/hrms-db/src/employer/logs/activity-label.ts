import { ACTIVITY_DESCRIPTION_NAMES } from "./activity-names.ts";

export function humanizeActivityName(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
}

export function activityLabel(input: {
  activityTypeId: number | null;
  description: string | null;
}): string {
  const description = input.description?.trim() ?? "";
  if (description) {
    return description;
  }
  const name =
    input.activityTypeId == null
      ? undefined
      : ACTIVITY_DESCRIPTION_NAMES[input.activityTypeId];
  if (name) {
    return humanizeActivityName(name);
  }
  if (input.activityTypeId != null && input.activityTypeId > 0) {
    return `Activity ${input.activityTypeId}`;
  }
  return "Activity";
}

const MAX_MATCHED_TYPE_IDS = 80;

export function activityTypeIdsForText(text: string): number[] {
  const needle = text.trim().toLowerCase();
  if (needle.length < 2) {
    return [];
  }
  const ids: number[] = [];
  for (const [idText, name] of Object.entries(ACTIVITY_DESCRIPTION_NAMES)) {
    const label = humanizeActivityName(name).toLowerCase();
    if (label.includes(needle) || name.toLowerCase().includes(needle)) {
      ids.push(Number(idText));
      if (ids.length >= MAX_MATCHED_TYPE_IDS) {
        break;
      }
    }
  }
  return ids;
}
