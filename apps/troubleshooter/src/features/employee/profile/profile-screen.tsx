import { Alert, Card, Descriptions } from "antd";
import { getEmployeeProfile } from "@/features/employee/profile/queries";
import { formatDate } from "@/shared/format-date";
import { Employee360Nav } from "@/shared/ui";

export async function EmployeeProfileScreen({
  employerId,
  employmentNumber,
}: {
  employerId: number;
  employmentNumber: string;
}): Promise<React.JSX.Element> {
  const profile = await getEmployeeProfile(employerId, employmentNumber);
  if (!profile) {
    return <Alert showIcon type="error" title="Employee was not found." />;
  }

  return (
    <>
      <Employee360Nav
        employerId={employerId}
        employmentNumber={employmentNumber}
      />
      {profile.userEmployeeMappingCount > 1 ? (
        <Alert
          className="mb-4"
          showIcon
          type="warning"
          title="This employee has more than one TUserEmployee mapping. Troubleshooter uses the highest UserID."
        />
      ) : null}
      <Card title="Profile">
        <Descriptions
          bordered
          column={2}
          size="small"
          items={[
            { key: "employeeId", label: "EmployeeId", children: profile.employeeId },
            { key: "userId", label: "UserID", children: profile.userId ?? "—" },
            { key: "role", label: "Role", children: profile.roleName ?? "—" },
            { key: "roleType", label: "Role type", children: profile.roleType ?? "—" },
            {
              key: "workEmail",
              label: "Work email",
              children: profile.workEmail ?? "—",
            },
            {
              key: "personalEmail",
              label: "Personal email",
              children: profile.personalEmail ?? "—",
            },
            { key: "phone", label: "Phone", children: profile.cellNumber ?? "—" },
            {
              key: "active",
              label: "Active",
              children: String(profile.isActive ?? ""),
            },
            {
              key: "designation",
              label: "Designation",
              children: profile.designation ?? "—",
            },
            { key: "gradeId", label: "Grade id", children: profile.gradeId ?? "—" },
            {
              key: "employmentType",
              label: "Employment type",
              children: profile.employmentType ?? "—",
            },
            {
              key: "location",
              label: "Location",
              children: profile.locationName ?? "—",
            },
            {
              key: "businessUnit",
              label: "Business unit",
              children: profile.businessUnitName ?? "—",
            },
            {
              key: "functionalManager",
              label: "Functional manager",
              children: profile.functionalManagerName ?? "—",
            },
            {
              key: "reportsTo",
              label: "Reports to",
              children: profile.reportsToName ?? "—",
            },
            { key: "doj", label: "DOJ", children: formatDate(profile.dateOfJoining) },
            {
              key: "dot",
              label: "DOT",
              children: formatDate(profile.dateOfTermination),
            },
          ]}
        />
      </Card>
    </>
  );
}
