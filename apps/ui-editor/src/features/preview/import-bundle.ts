import { PrototypeBundleSchema, type PrototypeBundle } from "../../schemas/prototype-bundle";
import { saveProjectSnapshot, savePrototypeBundle } from "../../lib/storage/project-store";

export async function importPrototypeBundle(file: File): Promise<PrototypeBundle> {
  const text = await file.text();
  const bundle = PrototypeBundleSchema.parse(JSON.parse(text));

  await savePrototypeBundle(bundle);
  await saveProjectSnapshot({
    project: bundle.project,
    sourceCapture: bundle.sourceCapture,
    revision: bundle.revision,
    screen: bundle.screen,
    nodes: bundle.nodes,
  });

  return bundle;
}