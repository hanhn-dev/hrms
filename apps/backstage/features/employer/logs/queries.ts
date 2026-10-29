import {
  getElmahStack as getElmahStackFromDb,
  getLogEmployerContext as getLogEmployerContextFromDb,
  listActivityLogs as listActivityLogsFromDb,
  listExceptionLogs as listExceptionLogsFromDb,
  listLoginSteps as listLoginStepsFromDb,
  listMyDetailsExecutionLogs as listMyDetailsExecutionLogsFromDb,
  listPageSessions as listPageSessionsFromDb,
  listTsqlErrorLogs as listTsqlErrorLogsFromDb,
  listSessionPages as listSessionPagesFromDb,
  type LogListFilters,
} from "@hrms/db";
import { requireFeature } from "@/shared/auth";
import { getHrmsDb } from "@/shared/db";

export type {
  ActivityLogList,
  ActivityLogRow,
  ElmahLogRow,
  ExceptionLogList,
  HandledErrorRow,
  LogEmployerContext,
  LoginStepList,
  LoginStepRow,
  MyDetailsExecutionLogList,
  MyDetailsExecutionLogRow,
  TsqlErrorLogList,
  TsqlErrorLogRow,
  PageHitRow,
  PageSessionList,
  PageSessionRow,
} from "@hrms/db";

export async function getLogEmployerContext(employerId: number) {
  await requireFeature("employers");
  return getLogEmployerContextFromDb(await getHrmsDb(), employerId);
}

export async function listActivityLogs(employerId: number, filters: LogListFilters) {
  await requireFeature("employers");
  return listActivityLogsFromDb(await getHrmsDb(), employerId, filters);
}

export async function listPageSessions(employerId: number, filters: LogListFilters) {
  await requireFeature("employers");
  return listPageSessionsFromDb(await getHrmsDb(), employerId, filters);
}

export async function listSessionPages(
  employerId: number,
  filters: LogListFilters & { sessionId: string },
) {
  await requireFeature("employers");
  return listSessionPagesFromDb(await getHrmsDb(), employerId, filters);
}

export async function listExceptionLogs(employerId: number, filters: LogListFilters) {
  await requireFeature("employers");
  return listExceptionLogsFromDb(await getHrmsDb(), employerId, filters);
}

export async function listLoginSteps(employerId: number, filters: LogListFilters) {
  await requireFeature("employers");
  return listLoginStepsFromDb(await getHrmsDb(), employerId, filters);
}

export async function listMyDetailsExecutionLogs(
  employerId: number,
  filters: LogListFilters,
) {
  await requireFeature("employers");
  return listMyDetailsExecutionLogsFromDb(await getHrmsDb(), employerId, filters);
}

export async function listTsqlErrorLogs(employerId: number, filters: LogListFilters) {
  await requireFeature("employers");
  return listTsqlErrorLogsFromDb(await getHrmsDb(), employerId, filters);
}

export async function getElmahStack(employerId: number, errorId: string) {
  await requireFeature("employers");
  return getElmahStackFromDb(await getHrmsDb(), employerId, errorId);
}
