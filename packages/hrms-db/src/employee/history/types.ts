export const HISTORY_VIEW_TYPES = ["History", "Future", "Pending"] as const;
export type HistoryViewType = (typeof HISTORY_VIEW_TYPES)[number];

export const HISTORY_CHANGE_TYPES = ["ADDED", "MODIFIED", "REMOVED"] as const;
export type HistoryChangeType = (typeof HISTORY_CHANGE_TYPES)[number];

export type HistoryChangeField = {
  field: string;
  oldValue: string;
  newValue: string;
  changeType: HistoryChangeType;
  effectiveDate?: string;
  futureTransId?: string;
};

export type HistoryChangeEvent = {
  timeStamp: string;
  editor: { name: string; id: string };
  section: string;
  changes: HistoryChangeField[];
};

export type HistoryChangeResponse = {
  totalItems: number;
  data: HistoryChangeEvent[];
};

export type LoadEmployeeHistoryInput = {
  employerId: number;
  employeeId: number;
  type: HistoryViewType;
  section?: string | null;
  from?: string | null;
  to?: string | null;
  pageNumber?: number;
  pageSize?: number;
};

export type HistoryEditor = {
  employeeId: number;
  name: string;
  employmentNumber: string;
};

export type CatalogueField = {
  fieldId: number;
  fieldName: string;
  displayText: string;
  displayOrder: number;
  dbColumn: string | null;
  fieldEntity: string | null;
  fieldTypeId: number | null;
  fieldTypeJsonSql: string | null;
};

/** Normalized snapshot used by the pure diff engine. */
export type HistorySnapshot = {
  entityKey: string;
  timeStamp: string;
  historyId: number;
  editorEmployeeId: number | null;
  isDeleted: boolean;
  values: Record<string, string>;
  /**
   * When set, the series is ordered by this (e.g. HistoryTransID) instead of timeStamp.
   * Matches My Details LEAD(... ORDER BY HistoryTransID).
   */
  seriesOrder?: number;
  /**
   * When false, the row is only a LEAD baseline — no field changes are emitted.
   * Used when ModifiedDateUtcTime is null (My Details filters those out).
   */
  emitEvent?: boolean;
  /** Future-only metadata applied to every emitted change. */
  effectiveDate?: string;
  futureTransId?: string;
};
