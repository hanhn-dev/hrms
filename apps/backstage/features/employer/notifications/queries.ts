import {
  listEmailNotifications as listEmailNotificationsFromDb,
  listPendingInbox as listPendingInboxFromDb,
  type EmailNotificationFilters,
  type PendingInboxFilters,
} from "@hrms/db";
import { requireFeature } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export type {
  EmailNotificationList,
  EmailNotificationRow,
  EmailStatusCount,
  PendingInboxCategory,
  PendingInboxList,
  PendingInboxRow,
  PendingInboxTypeCount,
} from "@hrms/db";

export async function listEmailNotifications(
  employerId: number,
  filters: EmailNotificationFilters,
) {
  await requireFeature("employers");
  return listEmailNotificationsFromDb(await getHrmsDb(), employerId, filters);
}

export async function listPendingInbox(
  employerId: number,
  filters: PendingInboxFilters,
) {
  await requireFeature("employers");
  return listPendingInboxFromDb(await getHrmsDb(), employerId, filters);
}
