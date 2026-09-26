import { z } from "zod";

const partsSchema = z.object({
  server: z.string().min(1),
  database: z.string().min(1),
  user: z.string().min(1),
  password: z.string().min(1),
  port: z.number().int().positive().optional(),
  encrypt: z.boolean().optional(),
  trustServerCertificate: z.boolean().optional(),
});

const connectionStringSchema = z.object({
  connectionString: z.string().min(1),
});

export const hrmsDbConfigSchema = z.union([connectionStringSchema, partsSchema]);

export type HrmsDbConfig = z.infer<typeof hrmsDbConfigSchema>;

export type HrmsMssqlConfig = {
  server: string;
  port: number;
  database: string;
  user: string;
  password: string;
  options: {
    encrypt: boolean;
    trustServerCertificate: boolean;
  };
};

function parseConnectionString(connectionString: string): HrmsMssqlConfig {
  const trimmed = connectionString.trim();
  const jdbc = trimmed.match(/^sqlserver:\/\/([^:;]+)(?::(\d+))?;(.+)$/i);
  if (jdbc) {
    const query = jdbc[3] ?? "";
    const params = Object.fromEntries(
      query.split(";").filter(Boolean).map((part) => {
        const [key, ...rest] = part.split("=");
        return [key?.toLowerCase() ?? "", rest.join("=")];
      }),
    );
    const database = params.database ?? params["initial catalog"];
    const user = params.user ?? params.username ?? params.uid;
    const password = params.password ?? params.pwd;
    if (!database || !user || !password) {
      throw new Error("connectionString is missing database, user, or password.");
    }
    return {
      server: jdbc[1] ?? "",
      port: Number(jdbc[2] || 1433),
      database,
      user,
      password,
      options: {
        encrypt: (params.encrypt ?? "true").toLowerCase() === "true",
        trustServerCertificate:
          (params.trustservercertificate ?? "false").toLowerCase() === "true",
      },
    };
  }
  const ado = Object.fromEntries(
    trimmed.split(";").filter(Boolean).map((part) => {
      const [key, ...rest] = part.split("=");
      return [key?.trim().toLowerCase() ?? "", rest.join("=").trim()];
    }),
  );
  const server = ado.server ?? ado["data source"];
  const database = ado.database ?? ado["initial catalog"];
  const user = ado["user id"] ?? ado.uid ?? ado.user;
  const password = ado.password ?? ado.pwd;
  if (!server || !database || !user || !password) {
    throw new Error("connectionString is missing server, database, user, or password.");
  }
  const portMatch = server.match(/,(\d+)$/);
  return {
    server: portMatch ? server.slice(0, portMatch.index) : server,
    port: portMatch ? Number(portMatch[1]) : 1433,
    database,
    user,
    password,
    options: {
      encrypt: (ado.encrypt ?? "false").toLowerCase() === "true",
      trustServerCertificate:
        (ado.trustservercertificate ?? "true").toLowerCase() === "true",
    },
  };
}

export function toMssqlConfig(input: HrmsDbConfig): HrmsMssqlConfig {
  const config = hrmsDbConfigSchema.parse(input);
  if ("connectionString" in config) {
    return parseConnectionString(config.connectionString);
  }
  return {
    server: config.server,
    port: config.port ?? 1433,
    database: config.database,
    user: config.user,
    password: config.password,
    options: {
      encrypt: config.encrypt ?? false,
      trustServerCertificate: config.trustServerCertificate ?? true,
    },
  };
}
