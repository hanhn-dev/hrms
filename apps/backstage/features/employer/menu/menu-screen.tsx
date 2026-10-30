import { Suspense } from "react";
import { MenuDiagnosisSlot, MenuTreeSlot } from "@/features/employer/menu/menu-slots";
import { PageHelp } from "@/shared/ui/shell-header-context";
import { SectionFallback } from "@/shared/ui/section-fallback";

export function MenuScreen({ employerId }: { employerId: number }): React.JSX.Element {
  return (
    <>
      <PageHelp
        source="menu"
        notes={[
          {
            id: "what-this-is",
            type: "info",
            title: "This is the menu for one organization",
            description:
              "Access Right Management shows the same tree. Saving does not give anyone permission to open an item. That stays on Roles. People need to sign out and back in before the left menu changes.",
          },
        ]}
      />
      <Suspense fallback={<SectionFallback title="Menu diagnosis" />}>
        <MenuDiagnosisSlot employerId={employerId} />
      </Suspense>
      <Suspense fallback={<SectionFallback title="Menu tree" />}>
        <MenuTreeSlot employerId={employerId} />
      </Suspense>
    </>
  );
}
