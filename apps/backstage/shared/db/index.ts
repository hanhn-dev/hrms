import "server-only";
import { cookies } from "next/headers";
import { createHrmsDb, queryCaptureGeneration, type HrmsDb } from "@hrms/db";
import { isTransientDbConnectionError } from "./connection-error";
import {
  ENVIRONMENT_COOKIE,
  getEnvironmentConfig,
  listConfiguredEnvironments,
  resolveEnvironment,
} from "./environments";

type CachedClient = {
  client: HrmsDb;
  queryCaptureGeneration: number;
};

const globalForDb = globalThis as typeof globalThis & {
  __hrmsDbClients?: Map<string, CachedClient>;
};

const clients =
  globalForDb.__hrmsDbClients ??
  (globalForDb.__hrmsDbClients = new Map<string, CachedClient>());

const QUERY_METHODS = new Set([
  "$queryRaw",
  "$queryRawUnsafe",
  "$executeRaw",
  "$executeRawUnsafe",
  "$transaction",
]);

export async function getSelectedEnvironment(): Promise<string> {
  const cookieStore = await cookies();
  return resolveEnvironment(cookieStore.get(ENVIRONMENT_COOKIE)?.value);
}

async function disposeClient(env: string): Promise<void> {
  const cached = clients.get(env);
  clients.delete(env);
  if (!cached) return;
  try {
    await cached.client.$disconnect();
  } catch {
    // Pool may already be dead.
  }
}

function createCachedClient(env: string): HrmsDb {
  const client = createHrmsDb(getEnvironmentConfig(env));
  clients.set(env, {
    client,
    queryCaptureGeneration,
  });
  return client;
}

function getRawClient(env: string): HrmsDb {
  const cached = clients.get(env);
  if (cached && cached.queryCaptureGeneration === queryCaptureGeneration) {
    return cached.client;
  }
  if (cached) {
    void disposeClient(env);
  }
  return createCachedClient(env);
}

function resilientClient(env: string): HrmsDb {
  return new Proxy({} as HrmsDb, {
    get(_target, prop) {
      const client = getRawClient(env);
      const value = Reflect.get(client, prop, client);
      if (typeof prop === "string" && QUERY_METHODS.has(prop)) {
        return async (...args: unknown[]) => {
          try {
            return await Reflect.apply(
              value as (...a: unknown[]) => Promise<unknown>,
              getRawClient(env),
              args,
            );
          } catch (error) {
            if (!isTransientDbConnectionError(error)) {
              throw error;
            }
            await disposeClient(env);
            const next = createCachedClient(env);
            const retry = Reflect.get(next, prop, next);
            return await Reflect.apply(
              retry as (...a: unknown[]) => Promise<unknown>,
              next,
              args,
            );
          }
        };
      }
      return typeof value === "function"
        ? (value as (...a: unknown[]) => unknown).bind(client)
        : value;
    },
  });
}

export async function getHrmsDb(env?: string): Promise<HrmsDb> {
  const resolved = env
    ? resolveEnvironment(env)
    : await getSelectedEnvironment();
  return resilientClient(resolved);
}

export async function assertSameEnvironment(env: string): Promise<void> {
  const current = await getSelectedEnvironment();
  if (env !== current) {
    throw new Error("Environment changed. Preview the change again.");
  }
}

export { listConfiguredEnvironments };
export type { HrmsDb };
