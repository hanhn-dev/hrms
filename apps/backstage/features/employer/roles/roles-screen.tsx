import { Suspense } from "react";
import { RoleGrantsSlot, RolesListSlot } from "@/features/employer/roles/roles-slots";
import { SectionFallback } from "@/shared/ui/section-fallback";

export function RolesScreen({
  employerId,
  selectedRoleId,
}: {
  employerId: number;
  selectedRoleId: number | null;
}): React.JSX.Element {
  return (
    <>
      <Suspense fallback={<SectionFallback title="Tenant roles" />}>
        <RolesListSlot employerId={employerId} />
      </Suspense>
      <Suspense
        fallback={
          <SectionFallback
            title={
              selectedRoleId
                ? `Page grants for role ${selectedRoleId}`
                : "Select a role to see page grants"
            }
          />
        }
      >
        <RoleGrantsSlot employerId={employerId} selectedRoleId={selectedRoleId} />
      </Suspense>
    </>
  );
}
