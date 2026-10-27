const TYPE_COLORS: Record<string, string> = {
  "Product Backlog Item": "blue",
  Bug: "red",
  Task: "green",
  "User Story": "cyan",
  Feature: "purple",
  Epic: "magenta",
  "Test Case": "gold",
  "Test Suite": "orange",
  Issue: "volcano",
  Impediment: "gold",
};

const STATE_COLORS: Record<string, string> = {
  New: "blue",
  Approved: "cyan",
  Committed: "geekblue",
  "To Do": "default",
  "In Progress": "gold",
  Active: "orange",
  Resolved: "purple",
  Done: "green",
  Closed: "default",
  Removed: "red",
  Blocked: "volcano",
};

const BORDER_COLORS: Record<string, string> = {
  blue: "#1677ff",
  red: "#ff4d4f",
  green: "#52c41a",
  cyan: "#13c2c2",
  purple: "#722ed1",
  magenta: "#eb2f96",
  gold: "#faad14",
  orange: "#fa8c16",
  volcano: "#fa541c",
  geekblue: "#2f54eb",
  lime: "#a0d911",
  default: "#d9d9d9",
};

const EXTRA_COLORS = ["lime", "magenta", "orange", "cyan", "purple", "geekblue", "volcano", "gold"];

function extraColor(label: string): string {
  let hash = 0;
  for (const char of label) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return EXTRA_COLORS[hash % EXTRA_COLORS.length] ?? "purple";
}

export function workItemTypeColor(type: string): string {
  return TYPE_COLORS[type] ?? extraColor(type);
}

export function workItemTypeBorderColor(type: string): string {
  return BORDER_COLORS[workItemTypeColor(type)] ?? "#722ed1";
}

/** Dark fills so a white label stays readable on a roadmap bar. */
const TYPE_BAR_COLORS: Record<string, string> = {
  "Product Backlog Item": "#0958d9",
  Bug: "#cf1322",
  Task: "#237804",
  "User Story": "#08979c",
  Feature: "#531dab",
  Epic: "#c41d7f",
  "Test Case": "#ad6800",
  "Test Suite": "#d46b08",
  Issue: "#d4380d",
  Impediment: "#1d39c4",
};

const EXTRA_BAR_COLORS = ["#7c3aed", "#0f766e", "#be123c", "#0369a1", "#4338ca", "#0e7490"] as const;

export function workItemTypeBarColor(type: string | undefined): string {
  const name = type?.trim() ?? "";
  if (name.length === 0) {
    return "#475569";
  }
  const known = TYPE_BAR_COLORS[name];
  if (known) {
    return known;
  }
  let hash = 0;
  for (const char of name) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return EXTRA_BAR_COLORS[hash % EXTRA_BAR_COLORS.length] ?? "#475569";
}

export function workItemStateColor(state: string): string {
  return STATE_COLORS[state] ?? extraColor(state);
}
