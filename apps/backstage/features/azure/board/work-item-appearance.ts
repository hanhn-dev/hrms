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

export function workItemStateColor(state: string): string {
  return STATE_COLORS[state] ?? extraColor(state);
}
