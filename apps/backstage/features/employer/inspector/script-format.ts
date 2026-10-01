import { format } from "sql-formatter";

export function formatSql(sql: string): { sql: string; warning: string | null } {
  if (sql.trim() === "") {
    return { sql, warning: null };
  }
  try {
    return {
      sql: format(sql, {
        language: "transactsql",
        keywordCase: "preserve",
        tabWidth: 2,
      }),
      warning: null,
    };
  } catch (error: unknown) {
    return {
      sql,
      warning: error instanceof Error ? error.message : "Could not format this script.",
    };
  }
}
