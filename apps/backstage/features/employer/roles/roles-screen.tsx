import { Suspense } from "react";
import {
  RoleGrantsSlot,
  RoleLocationBuSlot,
  RolesListSlot,
} from "@/features/employer/roles/roles-slots";
import { SectionFallback } from "@/shared/ui/section-fallback";
import { PageHelp } from "@/shared/ui/shell-header-context";

export function RolesScreen({
  employerId,
  selectedRoleId,
}: {
  employerId: number;
  selectedRoleId: number | null;
}): React.JSX.Element {
  return (
    <>
      <PageHelp
        source="roles"
        notes={[
          {
            id: "location-bu-scope",
            type: "info",
            title: "Location / BU scope on role page mappings",
            description:
              "Pick locations and business units by name (BU tree follows org hierarchy). Empty selection means unrestricted. Non-empty lists are stored as comma IDs on every TRolePagesMapping row and filter FN_LocationBU_GetEmployeeDetails_Clone (and SPs like SP_GetCountryOfEmployment). This is not workflow tRoleLocationMapping / tRoleBusinessUnitMapping.",
          },
          {
            id: "relogin",
            type: "warning",
            title: "Users must re-login",
            description:
              "After changing Location/BU scope, affected users need to log out and back in for menu and data-scope changes to apply.",
          },
        ]}
      />
      <Suspense fallback={<SectionFallback title="Tenant roles" />}>
        <RolesListSlot employerId={employerId} />
      </Suspense>
      <Suspense
        fallback={
          <SectionFallback
            title={
              selectedRoleId
                ? `Location / BU scope for role ${selectedRoleId}`
                : "Location / BU scope"
            }
          />
        }
      >
        <RoleLocationBuSlot
          employerId={employerId}
          selectedRoleId={selectedRoleId}
        />
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
