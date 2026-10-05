"use server";

import { getElmahStack } from "@/features/employer/logs/queries";

export async function loadElmahStack(
  employerId: number,
  errorId: string,
): Promise<string | null> {
  return getElmahStack(employerId, errorId);
}
