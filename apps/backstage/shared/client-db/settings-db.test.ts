import assert from "node:assert/strict";
import { afterEach, describe, it } from "vitest";
import { getSetting, migrateLocalSetting, setSetting } from "./settings-db.ts";

type Store = Map<IDBValidKey, unknown>;

function createMemoryIndexedDB(): IDBFactory {
  const databases = new Map<string, { version: number; stores: Map<string, Store> }>();

  function request<T>(run: (request: IDBRequest<T>) => void): IDBRequest<T> {
    const pending = {
      result: undefined as T,
      error: null,
      onsuccess: null as ((event: Event) => void) | null,
      onerror: null as ((event: Event) => void) | null,
    };
    queueMicrotask(() => {
      try {
        run(pending as IDBRequest<T>);
        pending.onsuccess?.({ target: pending } as unknown as Event);
      } catch (error) {
        pending.error = error as DOMException;
        pending.onerror?.({ target: pending } as unknown as Event);
      }
    });
    return pending as IDBRequest<T>;
  }

  return {
    open(name: string, version = 1): IDBOpenDBRequest {
      const pending = {
        result: undefined as unknown as IDBDatabase,
        error: null,
        onsuccess: null as ((event: Event) => void) | null,
        onerror: null as ((event: Event) => void) | null,
        onupgradeneeded: null as ((event: IDBVersionChangeEvent) => void) | null,
      };
      queueMicrotask(() => {
        let record = databases.get(name);
        if (!record) {
          record = { version: 0, stores: new Map() };
          databases.set(name, record);
        }
        const db = createDatabase(record);
        pending.result = db;
        if (record.version < version) {
          pending.onupgradeneeded?.({ target: pending } as unknown as IDBVersionChangeEvent);
          record.version = version;
        }
        pending.onsuccess?.({ target: pending } as unknown as Event);
      });
      return pending as IDBOpenDBRequest;
    },
  } as IDBFactory;

  function createDatabase(record: { stores: Map<string, Store> }): IDBDatabase {
    return {
      objectStoreNames: {
        contains: (storeName: string) => record.stores.has(storeName),
      },
      createObjectStore(storeName: string) {
        record.stores.set(storeName, new Map());
        return {} as IDBObjectStore;
      },
      transaction(storeName: string) {
        const store = record.stores.get(storeName);
        if (!store) throw new Error(`Missing store ${storeName}`);
        return {
          objectStore() {
            return {
              get: (key: IDBValidKey) => request<unknown>((pending) => {
                pending.result = store.get(key);
              }),
              put: (value: unknown, key: IDBValidKey) => request<IDBValidKey>((pending) => {
                store.set(key, value);
                pending.result = key;
              }),
            };
          },
        };
      },
      close() {},
    } as unknown as IDBDatabase;
  }
}

function memoryLocalStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => [...data.keys()][index] ?? null,
    removeItem: (key: string) => data.delete(key),
    setItem: (key: string, value: string) => data.set(key, value),
  };
}

describe("migrateLocalSetting", () => {
  const previousIndexedDb = globalThis.indexedDB;
  const previousLocalStorage = globalThis.localStorage;

  afterEach(() => {
    globalThis.indexedDB = previousIndexedDb;
    globalThis.localStorage = previousLocalStorage;
  });

  it("copies a valid localStorage payload once and drops the local copy", async () => {
    globalThis.indexedDB = createMemoryIndexedDB();
    globalThis.localStorage = memoryLocalStorage();
    localStorage.setItem("backstage:flow-roots", JSON.stringify({ "hrms-db": "D:/TDG HRMS DB" }));

    const copied = await migrateLocalSetting("flow-roots", "backstage:flow-roots");

    assert.deepEqual(copied, { "hrms-db": "D:/TDG HRMS DB" });
    assert.deepEqual(await getSetting("flow-roots"), { "hrms-db": "D:/TDG HRMS DB" });
    assert.equal(localStorage.getItem("backstage:flow-roots"), null);

    localStorage.setItem("backstage:flow-roots", JSON.stringify({ "hrms-db": "D:/other" }));
    const kept = await migrateLocalSetting("flow-roots", "backstage:flow-roots");
    assert.deepEqual(kept, { "hrms-db": "D:/TDG HRMS DB" });
    assert.equal(localStorage.getItem("backstage:flow-roots"), null);
  });

  it("ignores invalid JSON", async () => {
    globalThis.indexedDB = createMemoryIndexedDB();
    globalThis.localStorage = memoryLocalStorage();
    localStorage.setItem("backstage:flow-roots", "not-json");

    assert.equal(await migrateLocalSetting("flow-roots", "backstage:flow-roots"), undefined);
    assert.equal(await getSetting("flow-roots"), undefined);
    assert.equal(localStorage.getItem("backstage:flow-roots"), null);
  });

  it("stores a value that was not in localStorage", async () => {
    globalThis.indexedDB = createMemoryIndexedDB();
    globalThis.localStorage = memoryLocalStorage();

    await setSetting("flow-roots", { sourcecode: "D:/TDG HRMS/SourceCode" });

    assert.deepEqual(await getSetting("flow-roots"), { sourcecode: "D:/TDG HRMS/SourceCode" });
  });
});
