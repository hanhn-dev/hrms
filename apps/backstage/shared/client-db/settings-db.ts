const DB_NAME = "backstage";
const STORE_NAME = "settings";

function openSettings(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });
}

function readRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

export async function getSetting(key: string): Promise<unknown> {
  const db = await openSettings();
  try {
    const tx = db.transaction(STORE_NAME, "readonly");
    return await readRequest(tx.objectStore(STORE_NAME).get(key));
  } finally {
    db.close();
  }
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const db = await openSettings();
  try {
    const tx = db.transaction(STORE_NAME, "readwrite");
    await readRequest(tx.objectStore(STORE_NAME).put(value, key));
  } finally {
    db.close();
  }
}

/** Copy a localStorage JSON value into IndexedDB once, then drop the local copy. */
export async function migrateLocalSetting(idbKey: string, localStorageKey: string): Promise<unknown> {
  const existing = await getSetting(idbKey);
  if (existing !== undefined) {
    localStorage.removeItem(localStorageKey);
    return existing;
  }

  const raw = localStorage.getItem(localStorageKey);
  if (raw == null) return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    localStorage.removeItem(localStorageKey);
    return undefined;
  }

  await setSetting(idbKey, parsed);
  localStorage.removeItem(localStorageKey);
  return parsed;
}
