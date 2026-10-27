import path from "node:path";
import { handleInspectorRequest, warmEditorFocus } from "@hrms/inspector/server";
import { requireUser } from "@/lib/api-auth";

warmEditorFocus();

const repoRoot = path.resolve(process.cwd(), "../..");

export async function POST(request: Request): Promise<Response> {
  const gate = await requireUser();
  if (!gate.ok) return gate.response;
  return handleInspectorRequest(request, { root: repoRoot });
}
