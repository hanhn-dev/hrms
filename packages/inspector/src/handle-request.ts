import { z } from "zod";
import { focusLaunchedEditor, InspectorPathError, openInEditor } from "./open-editor.ts";

const bodySchema = z.object({
  file: z.string().min(1),
  line: z.number().int().positive(),
  column: z.number().int().positive(),
  prepare: z.boolean().optional(),
});

export async function handleInspectorRequest(
  request: Request,
  options: {
    root: string;
    editor?: string;
    spawnEditor?: (command: string, args: string[]) => Promise<void>;
  },
): Promise<Response> {
  if (process.env.NODE_ENV !== "development") {
    return new Response(null, { status: 404 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Invalid source location" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Invalid source location" }, { status: 400 });
  }

  const opening = openInEditor(
    { file: parsed.data.file, line: parsed.data.line, column: parsed.data.column, root: options.root, editor: options.editor },
    options.spawnEditor,
  );
  if (parsed.data.prepare === true) {
    void opening.catch(() => undefined);
    return new Response(null, { status: 204 });
  }

  try {
    await opening;
    if (options.spawnEditor == null) {
      focusLaunchedEditor({
        file: parsed.data.file,
        line: parsed.data.line,
        column: parsed.data.column,
        root: options.root,
        editor: options.editor,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not open the editor";
    const status = error instanceof InspectorPathError ? 400 : 500;
    return Response.json({ error: message }, { status });
  }

  return new Response(null, { status: 204 });
}
