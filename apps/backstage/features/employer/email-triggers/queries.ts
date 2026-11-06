import {
  getEmailTriggerSummary as getEmailTriggerSummaryFromDb,
  type EmailTriggerSummaryFilters,
} from "@hrms/db";
import { requireFeature } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export type {
  EmailDeliveryStatusCount,
  EmailTriggerModuleCount,
  EmailTriggerStatusCount,
  EmailTriggerSummary,
} from "@hrms/db";

export async function getEmailTriggerSummary(
  employerId: number,
  filters: EmailTriggerSummaryFilters,
) {
  await requireFeature("employers");
  return getEmailTriggerSummaryFromDb(await getHrmsDb(), employerId, filters);
}
