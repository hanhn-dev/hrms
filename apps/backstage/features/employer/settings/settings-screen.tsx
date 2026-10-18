import { Suspense } from "react";
import { Card } from "antd";
import {
  CustomerSettingsSlot,
  EmployerIdentitySlot,
  LicensedModulesSlot,
} from "@/features/employer/settings/settings-slots";
import { SectionFallback } from "@/shared/ui";
import { PageHelp } from "@/shared/ui/shell-header-context";

export function EmployerSettingsScreen({
  employerId,
}: {
  employerId: number;
}): React.JSX.Element {
  return (
    <>
      <PageHelp
        source="settings"
        notes={[
          {
            id: "hmac-confirm",
            type: "info",
            title: "Customer settings use preview then confirm",
            description:
              "Each category save and each JSON edit opens a before/after preview. Commit updates TCustomerSettings, and T&E or payroll satellite rows when those fields change.",
          },
          {
            id: "json-compact",
            type: "info",
            title: "JSON is stored compact",
            description:
              "JSON settings are validated then saved as compact text. Malformed JSON must be fixed in the editor before preview.",
          },
          {
            id: "no-side-effects",
            type: "warning",
            title: "No HRMS.Web post-save side effects",
            description:
              "Troubleshooter does not run LMS global rating scale, MMT key copy, or travel-config copy-from-master after save.",
          },
        ]}
      />
      <Suspense fallback={<SectionFallback title="Employer settings" />}>
        <EmployerIdentitySlot employerId={employerId} />
      </Suspense>
      <Suspense fallback={<SectionFallback title="Customer settings" />}>
        <CustomerSettingsSlot employerId={employerId} />
      </Suspense>
      <Suspense fallback={<SectionFallback title="Licensed modules" />}>
        <Card title="Licensed modules">
          <LicensedModulesSlot employerId={employerId} />
        </Card>
      </Suspense>
    </>
  );
}
