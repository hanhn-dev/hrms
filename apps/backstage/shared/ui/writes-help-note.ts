import type { PageHelpNote } from "@/shared/ui/page-help";

export function writesHelpNote(writesEnabled: boolean): PageHelpNote {
  if (writesEnabled) {
    return {
      id: "writes-enabled",
      type: "warning",
      title: "Writes are enabled",
      description:
        "Assign role, grant/revoke pages or tabs, unlock, and workflow config still require a preview and an explicit confirm. Workflow edits do not rewrite in-flight TRequestWorkflows rows.",
    };
  }
  return {
    id: "writes-readonly",
    type: "info",
    title: "Read-only mode",
    description:
      "Set TROUBLESHOOTER_WRITES_ENABLED=1 in a non-production environment listed in TROUBLESHOOTER_WRITES_ENVS to enable gated writes.",
  };
}
