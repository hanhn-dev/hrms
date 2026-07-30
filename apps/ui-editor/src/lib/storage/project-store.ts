import { z } from "zod";

import { DesignProjectSchema, DraftScreenSchema, EditableComponentNodeSchema, PrototypeRevisionSchema } from "../../schemas/design-project";
import { PrototypeBundleSchema } from "../../schemas/prototype-bundle";
import { SourceCaptureSchema } from "../../schemas/source-capture";

const DB_NAME = "ui-editor";
const DB_VERSION = 1;
const SNAPSHOT_STORE = "projectSnapshots";
const BUNDLE_STORE = "prototypeBundles";

const ProjectSnapshotSchema = z.object({
  project: DesignProjectSchema,
  sourceCapture: SourceCaptureSchema,
  revision: PrototypeRevisionSchema,
  screen: DraftScreenSchema,
  nodes: z.array(EditableComponentNodeSchema),
});

const ProjectSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  updatedAt: z.string().datetime({ offset: true }),
  currentRevisionId: z.string().min(1),
});

export type ProjectSnapshot = z.infer<typeof ProjectSnapshotSchema>;
export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;

export async function saveProjectSnapshot(snapshot: ProjectSnapshot): Promise<ProjectSnapshot> {
  const database = await openProjectDatabase();
  const validatedSnapshot = ProjectSnapshotSchema.parse(snapshot);

  await withTransaction(database, SNAPSHOT_STORE, "readwrite", (store) =>
    store.put(validatedSnapshot, validatedSnapshot.project.id),
  );

  return validatedSnapshot;
}

export async function loadProjectSnapshot(projectId: string): Promise<ProjectSnapshot | null> {
  const database = await openProjectDatabase();
  const snapshot = await withTransaction(database, SNAPSHOT_STORE, "readonly", (store) => store.get(projectId));

  return snapshot ? ProjectSnapshotSchema.parse(snapshot) : null;
}

export async function listProjectSummaries(): Promise<readonly ProjectSummary[]> {
  const database = await openProjectDatabase();
  const snapshots = await withTransaction(database, SNAPSHOT_STORE, "readonly", (store) => store.getAll());

  return z
    .array(ProjectSnapshotSchema)
    .parse(snapshots)
    .map((snapshot) =>
      ProjectSummarySchema.parse({
        id: snapshot.project.id,
        name: snapshot.project.name,
        updatedAt: snapshot.project.updatedAt,
        currentRevisionId: snapshot.project.currentRevisionId,
      }),
    );
}

export async function savePrototypeBundle(bundle: z.infer<typeof PrototypeBundleSchema>): Promise<void> {
  const database = await openProjectDatabase();
  const validatedBundle = PrototypeBundleSchema.parse(bundle);
  const key = createBundleKey(validatedBundle.project.id, validatedBundle.revision.id);

  await withTransaction(database, BUNDLE_STORE, "readwrite", (store) => store.put(validatedBundle, key));
}

export async function loadPrototypeBundle(projectId: string, revisionId: string): Promise<z.infer<typeof PrototypeBundleSchema> | null> {
  const database = await openProjectDatabase();
  const key = createBundleKey(projectId, revisionId);
  const bundle = await withTransaction(database, BUNDLE_STORE, "readonly", (store) => store.get(key));

  return bundle ? PrototypeBundleSchema.parse(bundle) : null;
}

function openProjectDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(SNAPSHOT_STORE)) {
        database.createObjectStore(SNAPSHOT_STORE);
      }

      if (!database.objectStoreNames.contains(BUNDLE_STORE)) {
        database.createObjectStore(BUNDLE_STORE);
      }
    };

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function createBundleKey(projectId: string, revisionId: string): string {
  return `${projectId}:${revisionId}`;
}

function withTransaction<T>(
  database: IDBDatabase,
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = operation(store);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}