import type { DataNode } from "antd/es/tree";
import {
  buildOrgUnitTree,
  type EmployerBusinessUnitOption,
  type EmployerLocationOption,
  type OrgUnitTreeNode,
} from "@hrms/db/org-unit-tree";
import { parseCommaIdList } from "@hrms/db/ids";

export type { EmployerBusinessUnitOption, EmployerLocationOption };

/** Client-safe subset of role Location/BU scope (no @hrms/db barrel). */
export type RoleLocationBuScopeView = {
  locationIds: string | null;
  businessUnitIds: string | null;
  matchingEmployeeCount: number;
  rowsDisagree: boolean;
};

export function idsFromCsv(csv: string | null | undefined): number[] {
  return parseCommaIdList(csv);
}

export function csvFromIds(ids: number[]): string {
  if (ids.length === 0) {
    return "";
  }
  return [...new Set(ids)].sort((left, right) => left - right).join(",");
}

export function locationSelectOptions(locations: EmployerLocationOption[]): Array<{
  value: number;
  label: string;
}> {
  return locations.map((location) => ({
    value: location.locationId,
    label: location.isActive
      ? `${location.locationName} (${location.locationId})`
      : `${location.locationName} (${location.locationId}, inactive)`,
  }));
}

function unitTitle(
  unitName: string,
  unitId: number,
  isActive: boolean,
): string {
  return isActive
    ? `${unitName} (${unitId})`
    : `${unitName} (${unitId}, inactive)`;
}

function toTreeData(
  nodes: OrgUnitTreeNode[],
  activeById: Map<number, boolean>,
): DataNode[] {
  return nodes.map((node) => ({
    key: node.unitId,
    value: node.unitId,
    title: unitTitle(
      node.unitName,
      node.unitId,
      activeById.get(node.unitId) ?? true,
    ),
    children:
      node.children.length > 0
        ? toTreeData(node.children, activeById)
        : undefined,
  }));
}

export function businessUnitTreeData(
  units: EmployerBusinessUnitOption[],
): DataNode[] {
  const activeById = new Map(
    units.map((unit) => [unit.unitId, unit.isActive] as const),
  );
  return toTreeData(buildOrgUnitTree(units), activeById);
}

export function allBusinessUnitIds(
  units: EmployerBusinessUnitOption[],
): number[] {
  return units.map((unit) => unit.unitId);
}

export function allLocationIds(locations: EmployerLocationOption[]): number[] {
  return locations.map((location) => location.locationId);
}
