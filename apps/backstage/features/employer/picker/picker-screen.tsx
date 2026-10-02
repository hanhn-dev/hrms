import { Suspense } from "react";
import { DbsEntryButton } from "@/features/employer/picker/dbs-entry-button";
import {
  PickerEmployersSlot,
  PickerHealthSlot,
} from "@/features/employer/picker/picker-slots";
import { getSelectedEnvironment } from "@/shared/db";
import { listConfiguredEnvironments } from "@/shared/db/environments";
import { EnvironmentSelect } from "@/shared/ui/environment-select";
import { PageHeader } from "@/shared/ui/page-header";
import { SectionFallback } from "@/shared/ui/section-fallback";
import { SignOutButton } from "@/shared/ui/sign-out-button";
import { Text } from "@/shared/ui/antd-rsc";

export async function EmployerPickerScreen({
  userName,
}: {
  userName: string;
}): Promise<React.JSX.Element> {
  const environment = await getSelectedEnvironment();
  const environments = listConfiguredEnvironments();

  return (
    <div className="mx-auto max-w-5xl p-6">
      <PageHeader
        title="Select employer"
        extra={
          <div className="flex items-center gap-3">
            <DbsEntryButton />
            <Text type="secondary">{userName}</Text>
            <EnvironmentSelect environment={environment} environments={environments} />
            <SignOutButton />
          </div>
        }
      />
      <Suspense fallback={<SectionFallback title="Database" />}>
        <PickerHealthSlot environment={environment} />
      </Suspense>
      <Suspense fallback={<SectionFallback title="Employers" />}>
        <PickerEmployersSlot />
      </Suspense>
    </div>
  );
}
