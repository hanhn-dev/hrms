/** Ant Design Table row-key field stamped onto ad-hoc query result rows. */
export const QUERY_RESULT_ROW_KEY = "__rowKey" as const;

export type QueryResultRow = Record<string, unknown> & {
  [QUERY_RESULT_ROW_KEY]: string;
};

/**
 * Stamp a stable `rowKey` onto query result rows for Ant Design Table.
 *
 * Prefer this over `rowKey={(_, index) => ...}` — antd 6 deprecates the
 * `index` parameter of the `rowKey` function and warns on every render.
 */
export function withRowKeys(
  rows: ReadonlyArray<Record<string, unknown>>,
): QueryResultRow[] {
  return rows.map((row, index) => ({
    ...row,
    [QUERY_RESULT_ROW_KEY]: String(index),
  }));
}
