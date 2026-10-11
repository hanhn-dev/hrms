import "server-only";
import { AzureDevOpsClient, loadConfig } from "@hrms/azure-devops";

let client: AzureDevOpsClient | null = null;

/**
 * Lazily builds a single AzureDevOpsClient for the process from
 * AZURE_DEVOPS_ORG_URL / AZURE_DEVOPS_PROJECT / AZURE_DEVOPS_TOKEN
 * (and optional AZURE_DEVOPS_TEAM). Throws if those env vars are not set —
 * callers should only reach this from gated server actions.
 */
export function getAzureDevOpsClient(): AzureDevOpsClient {
  if (client === null) {
    client = new AzureDevOpsClient(loadConfig());
  }
  return client;
}
