import type { ArmSourceKind, DropReason, MenuXmlHealth } from "@hrms/db/menu-tree";

export type MenuStatusTone = "success" | "info" | "warning" | "error";

export type MenuStatus = {
  tone: MenuStatusTone;
  title: string;
  detail: string;
  /** The working menu can be written back so Access Right Management shows it. */
  canShowInAccessRights: boolean;
};

export type MenuStatusInput = {
  employerId: number;
  health: MenuXmlHealth;
  inherited: boolean;
  source: ArmSourceKind;
  inXmlMissingFromHierarchy: ReadonlyArray<{ menuName: string | null; menuId: number }>;
  inHierarchyMissingFromXml: ReadonlyArray<{ menuName: string | null; menuId: number }>;
};

export function describeMenu(input: MenuStatusInput): MenuStatus {
  if (input.employerId === 0) {
    return {
      tone: "info",
      title: "This is the standard menu",
      detail:
        "Organizations that do not have their own menu use this one. Saving here does not change them. To give an organization this menu, use Copy below.",
      canShowInAccessRights: false,
    };
  }
  if (input.source === "employer" && input.health !== "healthy") {
    return {
      tone: "error",
      title: "Access Right Management is showing an empty menu",
      detail: input.inherited
        ? "This organization has a broken menu record, and no menu items of its own to put back."
        : "The items below are still stored. Put them back so Access Right Management can show this menu again.",
      canShowInAccessRights: !input.inherited,
    };
  }
  if (input.inherited) {
    return {
      tone: "info",
      title: "This organization uses the standard menu",
      detail:
        "It does not have a menu of its own. The tree below is the standard menu. Save only when you want a separate menu for this organization.",
      canShowInAccessRights: false,
    };
  }
  if (input.inHierarchyMissingFromXml.length > 0) {
    return {
      tone: "warning",
      title: "Access Right Management is missing items that are on this menu",
      detail: `Missing there: ${nameList(input.inHierarchyMissingFromXml)}. Put this menu back so those items show up.`,
      canShowInAccessRights: true,
    };
  }
  if (input.inXmlMissingFromHierarchy.length > 0) {
    return {
      tone: "warning",
      title: "Access Right Management lists items that are not on this menu",
      detail: `Only listed there: ${nameList(input.inXmlMissingFromHierarchy)}. Save this menu, or put an older copy back, so the two match.`,
      canShowInAccessRights: false,
    };
  }
  return {
    tone: "success",
    title: "Access Right Management is showing this menu",
    detail: "Drag an item to move it. Select an item to rename it or hide it, then save.",
    canShowInAccessRights: false,
  };
}

export function historyWhenLabel(value: string | null): string {
  if (value == null || value.trim() === "") {
    return "Date not recorded";
  }
  return value;
}

export function xmlHealthLabel(health: MenuXmlHealth): string {
  if (health === "blank") {
    return "Blank";
  }
  if (health === "root-only") {
    return "Root only";
  }
  return "Healthy";
}

export function dropReasonLabel(reason: DropReason): string {
  if (reason === "no-mapping") {
    return "No module, and not a general menu";
  }
  if (reason === "module-not-licensed") {
    return "Module is not licensed for this organization";
  }
  return "Parent left with no children";
}

function nameList(
  rows: ReadonlyArray<{ menuName: string | null; menuId: number }>,
): string {
  const shown = rows
    .slice(0, 8)
    .map((row) => row.menuName?.trim() || `Item ${row.menuId}`);
  if (rows.length > shown.length) {
    return `${shown.join(", ")}, and ${rows.length - shown.length} more`;
  }
  return shown.join(", ");
}
