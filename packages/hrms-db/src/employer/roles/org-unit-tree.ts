import { parseCommaIdList } from "../../shared/ids.ts";

export type EmployerLocationOption = {
  locationId: number;
  locationName: string;
  isActive: boolean;
};

export type EmployerBusinessUnitOption = {
  unitId: number;
  unitName: string;
  parentUnitId: number | null;
  isActive: boolean;
};

export type OrgUnitTreeNode = {
  unitId: number;
  unitName: string;
  parentUnitId: number | null;
  children: OrgUnitTreeNode[];
};

/** Build a forest of org units from a flat ParentUnitid list. Orphans become roots. */
export function buildOrgUnitTree(
  units: EmployerBusinessUnitOption[],
): OrgUnitTreeNode[] {
  const byId = new Map<number, OrgUnitTreeNode>();
  for (const unit of units) {
    byId.set(unit.unitId, {
      unitId: unit.unitId,
      unitName: unit.unitName,
      parentUnitId: unit.parentUnitId,
      children: [],
    });
  }

  const roots: OrgUnitTreeNode[] = [];
  for (const node of byId.values()) {
    const parentId = node.parentUnitId;
    if (parentId != null && parentId !== node.unitId && byId.has(parentId)) {
      byId.get(parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  function sortRecursive(nodes: OrgUnitTreeNode[]): void {
    nodes.sort((left, right) =>
      left.unitName.localeCompare(right.unitName, undefined, {
        sensitivity: "base",
      }),
    );
    for (const node of nodes) {
      sortRecursive(node.children);
    }
  }
  sortRecursive(roots);
  return roots;
}

export function collectOrgUnitIds(nodes: OrgUnitTreeNode[]): number[] {
  const ids: number[] = [];
  function walk(list: OrgUnitTreeNode[]): void {
    for (const node of list) {
      ids.push(node.unitId);
      walk(node.children);
    }
  }
  walk(nodes);
  return ids;
}

/** Ensure selected IDs missing from the catalog still appear as options. */
export function withMissingLocationOptions(
  options: EmployerLocationOption[],
  selectedIdsCsv: string | null | undefined,
): EmployerLocationOption[] {
  const selected = parseCommaIdList(selectedIdsCsv);
  if (selected.length === 0) {
    return options;
  }
  const known = new Set(options.map((row) => row.locationId));
  const extras: EmployerLocationOption[] = [];
  for (const locationId of selected) {
    if (!known.has(locationId)) {
      extras.push({
        locationId,
        locationName: `Unknown location ${locationId}`,
        isActive: false,
      });
    }
  }
  return extras.length === 0 ? options : [...extras, ...options];
}

export function withMissingBusinessUnitOptions(
  options: EmployerBusinessUnitOption[],
  selectedIdsCsv: string | null | undefined,
): EmployerBusinessUnitOption[] {
  const selected = parseCommaIdList(selectedIdsCsv);
  if (selected.length === 0) {
    return options;
  }
  const known = new Set(options.map((row) => row.unitId));
  const extras: EmployerBusinessUnitOption[] = [];
  for (const unitId of selected) {
    if (!known.has(unitId)) {
      extras.push({
        unitId,
        unitName: `Unknown unit ${unitId}`,
        parentUnitId: null,
        isActive: false,
      });
    }
  }
  return extras.length === 0 ? options : [...extras, ...options];
}
