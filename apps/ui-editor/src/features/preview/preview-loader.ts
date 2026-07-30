import { loadPrototypeBundle } from "../../lib/storage/project-store";

export async function loadPreviewBundle(projectId: string, revisionId: string): Promise<
  | { readonly bundle: Awaited<ReturnType<typeof loadPrototypeBundle>>; readonly error: null }
  | { readonly bundle: null; readonly error: string }
> {
  const bundle = await loadPrototypeBundle(projectId, revisionId);

  if (!bundle) {
    return {
      bundle: null,
      error: "No local prototype bundle was found for this revision. Import the exported bundle first.",
    };
  }

  if (bundle.bundleVersion !== 1) {
    return {
      bundle: null,
      error: `Prototype bundle version ${bundle.bundleVersion} is not supported by this preview runtime.`,
    };
  }

  if (bundle.revision.status !== "published") {
    return {
      bundle: null,
      error: "Only published revisions can be opened in preview mode.",
    };
  }

  return { bundle, error: null };
}