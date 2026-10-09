import { getStoredProcedureScript } from "@hrms/database-inspector";
import { format } from "sql-formatter";
import { NextResponse } from "next/server";
import { isProcedureName, procedureDocHref } from "@/features/flows/procedure-doc";
import { getInspectorConfig } from "@/shared/db/inspector";

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const database = url.searchParams.get("database") ?? "";
  const name = url.searchParams.get("name") ?? "";
  if (!database.trim() || !isProcedureName(name)) {
    return NextResponse.json({ error: "A database and procedure name are required." }, { status: 400 });
  }

  const docHref = procedureDocHref(database, name);
  try {
    const insight = await getStoredProcedureScript(await getInspectorConfig(), {
      schema: "dbo",
      name,
    });
    return NextResponse.json({
      docHref,
      script: insight.script ? readableScript(insight.script) : null,
      scriptError: insight.script ? null : insight.scriptUnavailableReason,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read the procedure from the database.";
    return NextResponse.json({ docHref, script: null, scriptError: message });
  }
}

function readableScript(script: string): string {
  try {
    return format(script, { language: "transactsql" });
  } catch {
    return script;
  }
}
