import { Alert } from "antd";
import { areWritesEnabled } from "@/shared/auth";
import { getSelectedEnvironment } from "@/shared/db";

export async function WritesBanner(): Promise<React.JSX.Element> {
  if (areWritesEnabled(await getSelectedEnvironment())) {
    return (
      <Alert
        className="mb-4"
        showIcon
        type="warning"
        title="Writes are enabled"
        description="Assign role, grant/revoke pages or tabs, and unlock still require a preview and an explicit confirm. Target users must log out after access changes."
      />
    );
  }
  return (
    <Alert
      className="mb-4"
      showIcon
      type="info"
      title="Read-only mode"
      description="Set TROUBLESHOOTER_WRITES_ENABLED=1 in a non-production environment listed in TROUBLESHOOTER_WRITES_ENVS to enable gated writes."
    />
  );
}
