"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Form, Space, TreeSelect, Typography } from "antd";
import { useRouter } from "next/navigation";
import {
  commitSetRoleLocationBu,
  previewSetRoleLocationBu,
} from "@/features/employer/roles/mutations";
import {
  listAllRoleBusinessUnits,
  listAllRoleLocations,
  searchRoleBusinessUnits,
  searchRoleLocations,
} from "@/features/employer/roles/queries";
import {
  allBusinessUnitIds,
  allLocationIds,
  businessUnitTreeData,
  csvFromIds,
  idsFromCsv,
  locationSelectOptions,
  type EmployerBusinessUnitOption,
  type EmployerLocationOption,
  type RoleLocationBuScopeView,
} from "@/features/employer/roles/location-bu-options";
import { ConfirmWriteModal, SearchSelect } from "@/shared/ui";

const { Text } = Typography;

function mergeSelected<T>(
  base: readonly T[],
  extra: readonly T[],
  selected: readonly number[],
  idOf: (row: T) => number,
): T[] {
  const chosen = new Set(selected);
  const byId = new Map(base.map((row) => [idOf(row), row]));
  for (const row of extra) {
    const id = idOf(row);
    if (chosen.has(id)) {
      byId.set(id, row);
    }
  }
  return [...byId.values()];
}

export function RoleLocationBuPanel({
  employerId,
  roleId,
  scope,
  locations,
  businessUnits,
  writesEnabled,
}: {
  employerId: number;
  roleId: number;
  scope: RoleLocationBuScopeView | null;
  locations: EmployerLocationOption[];
  businessUnits: EmployerBusinessUnitOption[];
  writesEnabled: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const [selectedLocationIds, setSelectedLocationIds] = useState<number[]>(() =>
    idsFromCsv(scope?.locationIds),
  );
  const [selectedBusinessUnitIds, setSelectedBusinessUnitIds] = useState<
    number[]
  >(() => idsFromCsv(scope?.businessUnitIds));
  const [locationQuery, setLocationQuery] = useState("");
  const [businessUnitQuery, setBusinessUnitQuery] = useState("");
  const [locationRows, setLocationRows] = useState(locations);
  const [businessUnitRows, setBusinessUnitRows] = useState(businessUnits);

  useEffect(() => {
    const trimmed = locationQuery.trim();
    if (trimmed.length < 2) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void searchRoleLocations(employerId, trimmed, selectedLocationIds).then((rows) => {
        if (!cancelled) {
          setLocationRows(rows);
        }
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [employerId, locationQuery, selectedLocationIds]);

  useEffect(() => {
    const trimmed = businessUnitQuery.trim();
    if (trimmed.length < 2) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void searchRoleBusinessUnits(employerId, trimmed, selectedBusinessUnitIds).then(
        (rows) => {
          if (!cancelled) {
            setBusinessUnitRows(rows);
          }
        },
      );
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [businessUnitQuery, employerId, selectedBusinessUnitIds]);

  const visibleLocations =
    locationQuery.trim().length < 2
      ? mergeSelected(locations, locationRows, selectedLocationIds, (row) => row.locationId)
      : locationRows;
  const visibleBusinessUnits =
    businessUnitQuery.trim().length < 2
      ? mergeSelected(
          businessUnits,
          businessUnitRows,
          selectedBusinessUnitIds,
          (row) => row.unitId,
        )
      : businessUnitRows;
  const locationOptions = locationSelectOptions(visibleLocations);
  const buTreeData = businessUnitTreeData(visibleBusinessUnits);

  const locationIdsCsv = csvFromIds(selectedLocationIds);
  const businessUnitIdsCsv = csvFromIds(selectedBusinessUnitIds);
  const isUnrestricted =
    selectedLocationIds.length === 0 && selectedBusinessUnitIds.length === 0;

  function clearToUnrestricted(): void {
    setSelectedLocationIds([]);
    setSelectedBusinessUnitIds([]);
  }

  return (
    <Space orientation="vertical" className="w-full" size="middle">
      {scope == null ? (
        <Alert
          showIcon
          type="warning"
          title="No page mappings for this role at this employer"
          description="Grant pages on the role first. Location/BU scope is stored on every TRolePagesMapping row."
        />
      ) : null}
      {scope?.rowsDisagree ? (
        <Alert
          showIcon
          type="warning"
          title="Page rows disagree on Location/BU"
          description="Different LocationIds or BusinessUnitIds exist across this role's page rows. Saving will stamp one list onto every row."
        />
      ) : null}
      {scope != null ? (
        <Text type="secondary">
          Matching employees under current scope: {scope.matchingEmployeeCount}
          {scope.locationIds == null && scope.businessUnitIds == null
            ? " (unrestricted)"
            : ""}
          . Leave both lists empty for unrestricted FN_LocationBU_GetEmployeeDetails_Clone
          access.
        </Text>
      ) : null}
      <Form layout="vertical" disabled={scope == null}>
        <Form.Item
          label={`Locations (${selectedLocationIds.length} selected)`}
          extra="Empty = unrestricted locations. Select all to map every employer location."
        >
          <Space orientation="vertical" className="w-full" size="small">
            <SearchSelect
              allowClear
              className="w-full"
              disabled={scope == null}
              filterOption={false}
              maxTagCount="responsive"
              mode="multiple"
              options={locationOptions}
              placeholder="Search and select locations by name"
              value={selectedLocationIds}
              onChange={(values: number[]) => {
                setSelectedLocationIds(values);
              }}
              onSearch={setLocationQuery}
            />
            <Space wrap>
              <Button
                disabled={!writesEnabled || scope == null || locations.length === 0}
                size="small"
                onClick={() => {
                  void listAllRoleLocations(employerId).then((rows) => {
                    setLocationRows(rows);
                    setSelectedLocationIds(allLocationIds(rows));
                  });
                }}
              >
                Select all locations
              </Button>
              <Button
                disabled={
                  !writesEnabled || scope == null || selectedLocationIds.length === 0
                }
                size="small"
                onClick={() => {
                  setSelectedLocationIds([]);
                }}
              >
                Clear locations
              </Button>
            </Space>
          </Space>
        </Form.Item>
        <Form.Item
          label={`Business units (${selectedBusinessUnitIds.length} selected)`}
          extra="Org hierarchy. Checking a parent selects its children. Empty = unrestricted BUs."
        >
          <Space orientation="vertical" className="w-full" size="small">
            <TreeSelect
              allowClear
              className="w-full"
              disabled={scope == null}
              maxTagCount="responsive"
              placeholder="Search and select business units by name"
              showCheckedStrategy={TreeSelect.SHOW_CHILD}
              filterTreeNode={false}
              showSearch
              treeCheckable
              treeData={buTreeData}
              treeDefaultExpandAll
              onSearch={setBusinessUnitQuery}
              value={selectedBusinessUnitIds}
              onChange={(values) => {
                const next = Array.isArray(values)
                  ? values.map((value) => Number(value))
                  : [];
                setSelectedBusinessUnitIds(next.filter((id) => Number.isFinite(id)));
              }}
            />
            <Space wrap>
              <Button
                disabled={
                  !writesEnabled || scope == null || businessUnits.length === 0
                }
                size="small"
                onClick={() => {
                  void listAllRoleBusinessUnits(employerId).then((rows) => {
                    setBusinessUnitRows(rows);
                    setSelectedBusinessUnitIds(allBusinessUnitIds(rows));
                  });
                }}
              >
                Select all business units
              </Button>
              <Button
                disabled={
                  !writesEnabled ||
                  scope == null ||
                  selectedBusinessUnitIds.length === 0
                }
                size="small"
                onClick={() => {
                  setSelectedBusinessUnitIds([]);
                }}
              >
                Clear business units
              </Button>
            </Space>
          </Space>
        </Form.Item>
        <Space wrap>
          <Button
            disabled={!writesEnabled || scope == null || isUnrestricted}
            onClick={clearToUnrestricted}
          >
            Clear to unrestricted
          </Button>
          <ConfirmWriteModal
            buttonLabel="Save Location/BU scope"
            disabled={!writesEnabled || scope == null}
            disabledReason={
              writesEnabled
                ? scope == null
                  ? "Role has no page mappings."
                  : undefined
                : "Writes are disabled."
            }
            title="Update role Location/BU scope"
            successMessage="Role Location/BU scope saved."
            previewAction={() =>
              previewSetRoleLocationBu({
                employerId,
                roleId,
                locationIds: locationIdsCsv,
                businessUnitIds: businessUnitIdsCsv,
              })
            }
            commitAction={commitSetRoleLocationBu}
            onDone={() => {
              router.refresh();
            }}
          />
        </Space>
      </Form>
    </Space>
  );
}
