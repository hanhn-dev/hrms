import type { ChangeRequestListItem } from "@/features/employee/change-requests/queries";

export type ChangeRequestDecideStatus = "Approved" | "Rejected";

/** Approve and Reject are available only while the request is still pending. */
export function changeRequestDecideActions(
  status: ChangeRequestListItem["status"],
): ChangeRequestDecideStatus[] {
  if (status === "pending") {
    return ["Approved", "Rejected"];
  }
  return [];
}
