import { Tag } from "antd";
import Link from "next/link";
import type { AccessibleEmployerView } from "@/features/employee/profile/accessible-employer-rows";

export function AccessibleEmployerChips({
  employers,
}: {
  employers: AccessibleEmployerView[];
}): React.JSX.Element {
  if (employers.length === 0) {
    return <>—</>;
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {employers.map((employer) =>
        employer.applied ? (
          <Tag key={employer.employerId} className="m-0" color="blue">
            {employer.label} · Applied
          </Tag>
        ) : (
          <Link key={employer.employerId} href={`/employers/${employer.employerId}`}>
            <Tag className="m-0">{employer.label}</Tag>
          </Link>
        ),
      )}
    </span>
  );
}
