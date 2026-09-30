import {
  listEmailNotifications as listEmailNotificationsFromDb,
  listPendingInbox as listPendingInboxFromDb,
  type EmailNotificationFilters,
  type PendingInboxFilters,
} from "@hrms/db";
import { requireRootAdmin } from "@/shared/auth";
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
  await requireRootAdmin();
  return listEmailNotificationsFromDb(await getHrmsDb(), employerId, filters);
}

export async function listPendingInbox(
  employerId: number,
  filters: PendingInboxFilters,
) {
  await requireRootAdmin();
  return listPendingInboxFromDb(await getHrmsDb(), employerId, filters);
}
