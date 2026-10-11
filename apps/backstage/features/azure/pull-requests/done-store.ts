import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

// Local-only tracking of which pull requests an operator has triaged. This is
// not HRMS employer data — it lives in a gitignored SQLite file next to the
// app, not in `@hrms/db` / SQL Server.
export const DEFAULT_DONE_STORE_PATH = path.join(process.cwd(), ".data", "pull-requests.sqlite");

// Opens, uses, and closes the database per call rather than keeping a
// long-lived handle — this is a low-traffic operator convenience store, and
// closing immediately avoids holding a file lock (notably on Windows, where
// an open handle prevents the containing directory from being removed).
function withDb<T>(dbPath: string, run: (database: DatabaseSync) => T): T {
  mkdirSync(path.dirname(dbPath), { recursive: true });
  const database = new DatabaseSync(dbPath);
  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS pull_request_done (
        pull_request_id INTEGER PRIMARY KEY,
        marked_by TEXT,
        marked_at TEXT NOT NULL
      )
    `);
    return run(database);
  } finally {
    database.close();
  }
}

/** Returns the subset of `pullRequestIds` currently marked done. */
export function getDonePullRequestIds(
  pullRequestIds: readonly number[],
  dbPath: string = DEFAULT_DONE_STORE_PATH,
): number[] {
  if (pullRequestIds.length === 0) {
    return [];
  }
  return withDb(dbPath, (database) => {
    const placeholders = pullRequestIds.map(() => "?").join(", ");
    const rows = database
      .prepare(`SELECT pull_request_id FROM pull_request_done WHERE pull_request_id IN (${placeholders})`)
      .all(...pullRequestIds) as { pull_request_id: number }[];
    return rows.map((row) => row.pull_request_id);
  });
}

/** Marks (or unmarks) a single pull request as done. */
export function setPullRequestDone(
  pullRequestId: number,
  done: boolean,
  markedBy: string | null,
  dbPath: string = DEFAULT_DONE_STORE_PATH,
): void {
  withDb(dbPath, (database) => {
    if (done) {
      database
        .prepare(
          `INSERT INTO pull_request_done (pull_request_id, marked_by, marked_at)
           VALUES (?, ?, ?)
           ON CONFLICT(pull_request_id) DO UPDATE SET marked_by = excluded.marked_by, marked_at = excluded.marked_at`,
        )
        .run(pullRequestId, markedBy, new Date().toISOString());
      return;
    }
    database.prepare(`DELETE FROM pull_request_done WHERE pull_request_id = ?`).run(pullRequestId);
  });
}
