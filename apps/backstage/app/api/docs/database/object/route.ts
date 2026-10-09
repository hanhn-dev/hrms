import { NextResponse } from "next/server";
import { z } from "zod";
import { loadDatabaseObject, loadObjectKinds } from "@/features/docs/object-panel/load-object";

const querySchema = z.object({
  schema: z.string().trim().min(1).max(128),
  name: z.string().trim().min(1).max(128),
  database: z.string().trim().min(1).max(64),
});

const kindsSchema = z.object({
  objects: z
    .array(
      z.object({
        schema: z.string().trim().min(1).max(128),
        name: z.string().trim().min(1).max(128),
      }),
    )
    .max(200),
});

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    schema: url.searchParams.get("schema") ?? "",
    name: url.searchParams.get("name") ?? "",
    database: url.searchParams.get("database") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ message: "A schema, name, and database are required." }, { status: 400 });
  }

  try {
    const result = await loadDatabaseObject(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read this object.";
    return NextResponse.json({ message }, { status: 503 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const parsed = kindsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ kinds: [] }, { status: 400 });
  }
  try {
    const kinds = await loadObjectKinds(parsed.data.objects);
    return NextResponse.json({ kinds });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not look up these objects.";
    return NextResponse.json({ message }, { status: 503 });
  }
}
