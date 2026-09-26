import "server-only";
import type { HrmsDbConfig } from "@hrms/db";

export const ENVIRONMENT_COOKIE = "troubleshooter-env";

function normalizeEnvName(raw: string): string {
  return raw.trim().toUpperCase();
}

function listedEnvironments(): string[] {
  const listed = process.env.TROUBLESHOOTER_ENVS;
  if (listed && listed.trim() !== "") {
    return [
      ...new Set(listed.split(",").map(normalizeEnvName).filter(Boolean)),
    ];
  }
  return ["DEV"];
}

function envVar(name: string, key: string): string | undefined {
  const prefixed = process.env[`TROUBLESHOOTER_DB_${name}_${key}`];
  if (prefixed && prefixed.trim() !== "") {
    return prefixed;
  }
  if (name === "DEV") {
    const unprefixed = process.env[`TROUBLESHOOTER_DB_${key}`];
    if (unprefixed && unprefixed.trim() !== "") {
      return unprefixed;
    }
  }
  return undefined;
}

function configFor(name: string): HrmsDbConfig | null {
  const connectionString = envVar(name, "CONNECTION_STRING");
  if (connectionString) {
    return { connectionString };
  }
  const server = envVar(name, "HOST");
  const database = envVar(name, "DATABASE");
  const user = envVar(name, "USER");
  const password = envVar(name, "PASSWORD");
  if (!server || !database || !user || !password) {
    return null;
  }
  const portRaw = envVar(name, "PORT");
  const port = portRaw ? Number(portRaw) : undefined;
  return {
    server,
    database,
    user,
    password,
    ...(port !== undefined && Number.isFinite(port) ? { port } : {}),
    encrypt: envVar(name, "ENCRYPT") === "true",
    trustServerCertificate: envVar(name, "TRUST_SERVER_CERTIFICATE") !== "false",
  };
}

export function listConfiguredEnvironments(): string[] {
  return listedEnvironments().filter((name) => configFor(name) !== null);
}

export function getDefaultEnvironment(): string {
  const names = listConfiguredEnvironments();
  const configured = process.env.TROUBLESHOOTER_DEFAULT_ENV;
  if (configured) {
    const name = normalizeEnvName(configured);
    if (names.includes(name)) {
      return name;
    }
  }
  return names[0] ?? "DEV";
}

export function getEnvironmentConfig(name: string): HrmsDbConfig {
  const normalized = normalizeEnvName(name);
  const config = configFor(normalized);
  if (!config) {
    throw new Error(
      `Set TROUBLESHOOTER_DB_${normalized}_CONNECTION_STRING or host/database/user/password.`,
    );
  }
  return config;
}

export function resolveEnvironment(cookieValue: string | undefined): string {
  if (cookieValue) {
    const name = normalizeEnvName(cookieValue);
    if (listConfiguredEnvironments().includes(name)) {
      return name;
    }
  }
  return getDefaultEnvironment();
}

export function parseEnvironmentName(raw: string): string | null {
  const name = normalizeEnvName(raw);
  return listConfiguredEnvironments().includes(name) ? name : null;
}

export function writesAllowedForEnvironment(env: string): boolean {
  const allowed = (process.env.TROUBLESHOOTER_WRITES_ENVS ?? "DEV")
    .split(",")
    .map(normalizeEnvName)
    .filter(Boolean);
  return allowed.includes(normalizeEnvName(env));
}
