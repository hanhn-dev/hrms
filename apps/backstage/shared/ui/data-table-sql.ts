import { format } from "sql-formatter";

export function formatTableQueryScript(script: string): {
  sql: string;
  warning: string | null;
} {
  if (typeof script !== "string" || script.trim() === "") {
    return { sql: "", warning: null };
  }
  const parts = script.split(/\n\n(?=-- query \d+\n)/);
  if (parts.length > 1) {
    const formatted = parts.map((part) => {
      const match = part.match(/^(-- query \d+\n)([\s\S]*)$/);
      if (!match) {
        return formatOne(part);
      }
      const body = formatOne(match[2] ?? "");
      return {
        sql: `${match[1]}${body.sql}`,
        warning: body.warning,
      };
    });
    return {
      sql: formatted.map((part) => part.sql).join("\n\n"),
      warning: formatted.find((part) => part.warning)?.warning ?? null,
    };
  }
  return formatOne(script);
}

function formatOne(script: string): {
  sql: string;
  warning: string | null;
} {
  try {
    return {
      sql: format(script, {
        language: "transactsql",
        keywordCase: "preserve",
        tabWidth: 2,
      }),
      warning: null,
    };
  } catch (error: unknown) {
    return {
      sql: script,
      warning:
        error instanceof Error ? error.message : "Could not format this script.",
    };
  }
}
