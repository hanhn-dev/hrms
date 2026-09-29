"use server";

import { cookies } from "next/headers";
import { ENVIRONMENT_COOKIE, parseEnvironmentName } from "./environments";

export async function setTroubleshooterEnvironment(name: string): Promise<void> {
  const resolved = parseEnvironmentName(name);
  if (!resolved) {
    throw new Error(`Unknown environment: ${name}`);
  }
  const cookieStore = await cookies();
  cookieStore.set(ENVIRONMENT_COOKIE, resolved, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}
