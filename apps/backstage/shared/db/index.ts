import "server-only";
import { cookies } from "next/headers";
import { createHrmsDb, type HrmsDb } from "@hrms/db";
import {
  ENVIRONMENT_COOKIE,
  getEnvironmentConfig,
  listConfiguredEnvironments,
  resolveEnvironment,
} from "./environments";

const clients = new Map<string, HrmsDb>();

export async function getSelectedEnvironment(): Promise<string> {
  const cookieStore = await cookies();
  return resolveEnvironment(cookieStore.get(ENVIRONMENT_COOKIE)?.value);
}

export async function getHrmsDb(): Promise<HrmsDb> {
  const env = await getSelectedEnvironment();
  const existing = clients.get(env);
  if (existing) {
    return existing;
  }
  const client = createHrmsDb(getEnvironmentConfig(env));
  clients.set(env, client);
  return client;
}

export async function assertSameEnvironment(env: string): Promise<void> {
  const current = await getSelectedEnvironment();
  if (env !== current) {
    throw new Error("Environment changed. Preview the change again.");
  }
}

export { listConfiguredEnvironments };
export type { HrmsDb };
