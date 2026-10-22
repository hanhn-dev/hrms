import { Alert, Card, Descriptions, Tag } from "antd";
import type { EmployeeLocationBuScope } from "@hrms/db";
import { EntityLink } from "@/shared/entity-link";

function displayList(value: string | null): string {
  return value ?? "(null — unrestricted)";
}

export function LocationBuScopeCard({
  employerId,
  scope,
}: {
  employerId: number;
  scope: EmployeeLocationBuScope;
}): React.JSX.Element {
  return (
    <Card className="mb-4" title="Effective Location / BU scope">
      {!scope.employeeInScope ? (
        <Alert
          className="mb-4"
          showIcon
          type="warning"
          title="This employee is outside the effective Location/BU scope"
          description="FN_LocationBU_GetEmployeeDetails_Clone will not return this employee for the login, so SPs such as SP_GetCountryOfEmployment can return empty. Fix role Location/BU on the Roles page, or clear the lists for unrestricted access."
        />
      ) : null}
      <Descriptions
        bordered
        column={2}
        size="small"
        items={[
          {
            key: "employeeLoc",
            label: "Employee LocationId",
            children: scope.employeeLocationId ?? "—",
          },
          {
            key: "employeeBu",
            label: "Employee BusinessUnitId",
            children: scope.employeeBusinessUnitId ?? "—",
          },
          {
            key: "userLoc",
            label: "User map LocationIds",
            children: displayList(scope.userLocationIds),
          },
          {
            key: "userBu",
            label: "User map BusinessUnitIds",
            children: displayList(scope.userBusinessUnitIds),
          },
          {
            key: "roleLoc",
            label: "Role map LocationIds",
            children: (
              <>
                {displayList(scope.roleLocationIds)}
                {scope.roleId != null ? (
                  <>
                    {" "}
                    <EntityLink
                      employerId={employerId}
                      entity={{ kind: "role", roleId: scope.roleId }}
                    >
                      Edit role {scope.roleId}
                    </EntityLink>
                  </>
                ) : null}
              </>
            ),
          },
          {
            key: "roleBu",
            label: "Role map BusinessUnitIds",
            children: displayList(scope.roleBusinessUnitIds),
          },
          {
            key: "effectiveLoc",
            label: "Effective LocationIds",
            children: displayList(scope.effectiveLocationIds),
          },
          {
            key: "effectiveBu",
            label: "Effective BusinessUnitIds",
            children: displayList(scope.effectiveBusinessUnitIds),
          },
          {
            key: "inScope",
            label: "Employee in scope",
            children: (
              <Tag color={scope.employeeInScope ? "green" : "red"}>
                {scope.employeeInScope ? "Yes" : "No"}
              </Tag>
            ),
          },
          {
            key: "matchCount",
            label: "Employees matching scope",
            children: scope.matchingEmployeeCount,
          },
        ]}
      />
    </Card>
  );
}
