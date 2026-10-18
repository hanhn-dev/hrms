import path from "node:path";
import { handleInspectorRequest, warmEditorFocus } from "@hrms/inspector/server";

warmEditorFocus();

const repoRoot = path.resolve(process.cwd(), "../..");

export function POST(request: Request): Promise<Response> {
  return handleInspectorRequest(request, { root: repoRoot });
}
