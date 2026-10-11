import { z } from 'zod';
import type { AzureDevOpsConfig } from './types.js';

const ConfigSchema = z.object({
  AZURE_DEVOPS_ORG_URL: z.string().url(),
  AZURE_DEVOPS_PROJECT: z.string().min(1),
  AZURE_DEVOPS_TOKEN: z.string().min(1),
  AZURE_DEVOPS_TEAM: z.string().min(1).optional(),
});

export function loadConfig(): AzureDevOpsConfig {
  const parsed = ConfigSchema.parse(process.env);
  return {
    orgUrl: parsed.AZURE_DEVOPS_ORG_URL,
    project: parsed.AZURE_DEVOPS_PROJECT,
    token: parsed.AZURE_DEVOPS_TOKEN,
    team: parsed.AZURE_DEVOPS_TEAM,
  };
}
