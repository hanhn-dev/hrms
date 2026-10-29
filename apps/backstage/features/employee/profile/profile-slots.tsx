import { Alert, Card, Descriptions, Tag } from "antd";
import Link from "next/link";
import { accessibleEmployerRows } from "@/features/employee/profile/accessible-employer-rows";
import {
  getEmployeeProfile,
  listAccessibleEmployers,
} from "@/features/employee/profile/queries";
import { formatDate } from "@/shared/format-date";

export async function EmployeeProfileSlot({
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
  const employers = accessibleEmployerRows(
    await listAccessibleEmployers(profile),
    employerId,
  );

  return (
    <>
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
              span: 2,
              children: formatDate(profile.dateOfTermination),
            },
            {
              key: "employers",
              label: "Employers",
              span: 2,
              children: (
                <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>{employers.length}</span>
                  {employers.map((employer) =>
                    employer.applied ? (
                      <span
                        key={employer.employerId}
                        className="inline-flex items-center gap-1"
                      >
                        {employer.label}
                        <Tag className="m-0">Applied</Tag>
                      </span>
                    ) : (
                      <Link
                        key={employer.employerId}
                        href={`/employers/${employer.employerId}`}
                      >
                        {employer.label}
                      </Link>
                    ),
                  )}
                </span>
              ),
            },
          ]}
        />
      </Card>
    </>
  );
}
