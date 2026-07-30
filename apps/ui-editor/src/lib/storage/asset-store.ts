import { z } from "zod";

import { createIsoTimestamp } from "../core/identity";

const DB_NAME = "ui-editor";
const DB_VERSION = 1;
const ASSET_STORE = "assets";

const AssetRecordSchema = z.object({
  id: z.string().min(1),
  contentRef: z.string().min(1),
  mimeType: z.string().min(1),
  name: z.string().min(1).nullable(),
  createdAt: z.string().datetime({ offset: true }),
});

export type AssetRecord = z.infer<typeof AssetRecordSchema>;

export async function saveAsset(record: Omit<AssetRecord, "createdAt">): Promise<AssetRecord> {
  const database = await openAssetDatabase();
  const storedRecord = AssetRecordSchema.parse({
    ...record,
    createdAt: createIsoTimestamp(),
  });

  await withTransaction(database, ASSET_STORE, "readwrite", (store) => store.put(storedRecord));
  return storedRecord;
}

export async function loadAsset(id: string): Promise<AssetRecord | null> {
  const database = await openAssetDatabase();
  const record = await withTransaction(database, ASSET_STORE, "readonly", (store) => store.get(id));
  return record ? AssetRecordSchema.parse(record) : null;
}

export async function deleteAsset(id: string): Promise<void> {
  const database = await openAssetDatabase();
  await withTransaction(database, ASSET_STORE, "readwrite", (store) => store.delete(id));
}

function openAssetDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(ASSET_STORE)) {
        database.createObjectStore(ASSET_STORE, { keyPath: "id" });
      }
    };

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
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