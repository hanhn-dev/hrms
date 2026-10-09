import "server-only";
import {
  findScriptObject,
  findScriptObjectKinds,
  getModuleDefinition,
  getTableDefinition,
  type ScriptObjectKind,
} from "@hrms/db";
import { databaseHref, getCurrentDatabaseDocs } from "@/lib/database-docs";
import { getHrmsDb } from "@/shared/db";
import { columnsFromDefinitionLines, type ObjectPanelResult } from "./object-payload.ts";

function docHref(database: string, objectName: string): string | null {
  const match = getCurrentDatabaseDocs().find(
    (doc) =>
      doc.database === database && doc.objectName.toLowerCase() === objectName.toLowerCase(),
  );
  return match ? databaseHref(match.currentSlug) : null;
}

export async function loadDatabaseObject(input: {
  schema: string;
  name: string;
  database: string;
}): Promise<ObjectPanelResult> {
  const db = await getHrmsDb();
  const found = await findScriptObject(db, { schema: input.schema, name: input.name });
  if (!found) {
    return {
      found: false,
      schema: input.schema,
      name: input.name,
      message: `Unable to find ${input.schema}.${input.name} in the connected database.`,
    };
  }

  const href = docHref(input.database, found.name);
  if (found.kind === "table") {
    const definition = await getTableDefinition(db, { schema: found.schema, name: found.name });
    if (!definition.found) {
      return {
        found: false,
        schema: found.schema,
        name: found.name,
        message: `Unable to find ${found.schema}.${found.name} in the connected database.`,
      };
    }
    return {
      found: true,
      schema: found.schema,
      name: found.name,
      kind: "table",
      columns: columnsFromDefinitionLines(definition.lines),
      docHref: href,
    };
  }

  const moduleDefinition = await getModuleDefinition(db, {
    schema: found.schema,
    name: found.name,
    kind: found.kind,
  });
  return {
    found: true,
    schema: moduleDefinition.schema,
    name: moduleDefinition.name,
    kind: moduleDefinition.kind,
    definition: moduleDefinition.definition,
    unavailableReason: moduleDefinition.unavailableReason,
    docHref: href,
  };
}

export async function loadObjectKinds(
  objects: ReadonlyArray<{ schema: string; name: string }>,
): Promise<Array<{ schema: string; name: string; kind: ScriptObjectKind }>> {
  if (objects.length === 0) return [];
  return findScriptObjectKinds(await getHrmsDb(), objects);
}
