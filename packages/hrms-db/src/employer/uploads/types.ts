import type { UploadTypeKey } from "./classify";

export {
  EXPIRED_AFTER_DAYS,
  STUCK_AFTER_HOURS,
  UPLOAD_ERROR_CLASSES,
  UPLOAD_TYPE_DB,
  UPLOAD_TYPE_KEYS,
  UPLOAD_TYPE_LABELS,
  type UploadErrorClass,
  type UploadHeaderMismatch,
  type UploadTypeKey,
} from "./classify";

export const UPLOAD_CATEGORY_ID = {
  creation: 6,
  profile: 1,
  image: 1,
} as const;

export const IMAGE_SECTION_ID = -1;
export const IMAGE_SECTION_NAME = "Bulk Image Update";

export const MAX_CLASSIFIED_ROWS = 500;
export const DYNAMIC_SQL_PREVIEW_LENGTH = 2000;
export const BATCH_JSON_PREVIEW_LENGTH = 4000;

export const PIPELINE_STEPS = [
  "Download template",
  "Upload (parse)",
  "Validate (Node + ValidationRule)",
  "Process",
  "Processed",
] as const;

export type UploadCountryOption = {
  countryId: number;
  countryName: string;
};

export type UploadCatalogField = {
  fieldId: number;
  sectionId: number;
  section: string;
  fieldName: string | null;
  displayText: string | null;
  displayOrder: number | null;
  fieldEntity: string | null;
  fieldType: string | null;
  isMandatory: boolean | number | null;
  isValidate: boolean | number | null;
  isHidden: boolean | number | null;
  isActive: boolean | number | null;
  validationRule: string | null;
  validationRuleNames: string[];
  fieldTypeJsonSql: string | null;
  dbTable: string | null;
  dbColumn: string | null;
  countryId: number | null;
  countryName: string | null;
};

export type UploadCatalogSection = {
  sectionId: number;
  section: string;
  dmlAllowed: string | null;
  historyTable: string | null;
  fieldCount: number;
};

export type UploadCatalog = {
  type: UploadTypeKey;
  uploadType: string;
  label: string;
  categoryId: number;
  countryId: number;
  rowKey: "Work Email" | "ID";
  pipeline: string[];
  notes: string[];
  sections: UploadCatalogSection[];
  fields: UploadCatalogField[];
};

export type UploadListFilters = {
  type?: UploadTypeKey | null;
  status?: string | null;
  uploadId?: number | null;
};

export type UploadListItem = {
  uploadId: number;
  uploadType: string | null;
  type: UploadTypeKey | null;
  status: string | null;
  countryId: number | null;
  countryName: string | null;
  categoryId: number | null;
  documentId: string | null;
  errorMessage: string | null;
  isShowData: boolean | number | null;
  createdBy: number | null;
  createdByName: string | null;
  createdDate: string | null;
  validatedOn: string | null;
  processedOn: string | null;
  updatedDate: string | null;
  total: number;
  valid: number;
  invalid: number;
  processed: number;
  unprocessed: number;
  sectionCount: number;
  ageHours: number | null;
  stuck: boolean;
  expired: boolean;
};

export type UploadSectionRollup = {
  uploadSectionId: number;
  sectionId: number | null;
  section: string | null;
  fieldsCsv: string | null;
  selectedFields: string[];
  fieldCount: number;
  total: number;
  valid: number;
  invalid: number;
  processed: number;
  unprocessed: number;
};

export type UploadSectionDataRow = {
  rowIndex: number;
  values: Record<string, string | null>;
  employeeId: number | null;
  workEmail: string | null;
  employeeName: string | null;
  employmentNumber: string | null;
  isValid: boolean | null;
  isProcessed: boolean | null;
  errors: string[];
  errorSummary: string | null;
};

export type UploadSectionData = {
  uploadSectionId: number;
  sectionId: number | null;
  section: string | null;
  fields: string[];
  parseError: string | null;
  totalMatched: number;
  rows: UploadSectionDataRow[];
};

export type UploadDetail = {
  uploadId: number;
  employerId: number;
  uploadType: string | null;
  type: UploadTypeKey | null;
  status: string | null;
  countryId: number | null;
  countryName: string | null;
  categoryId: number | null;
  documentId: string | null;
  templateId: number | null;
  errorMessage: string | null;
  isShowData: boolean | number | null;
  isQueue: number | null;
  batchNo: number | null;
  createdBy: number | null;
  createdByName: string | null;
  createdDate: string | null;
  validatedBy: number | null;
  validatedOn: string | null;
  processedBy: number | null;
  processedOn: string | null;
  updatedDate: string | null;
  total: number;
  valid: number;
  invalid: number;
  processed: number;
  unprocessed: number;
  sectionCount: number;
  ageHours: number | null;
  stuck: boolean;
  expired: boolean;
  sections: UploadSectionRollup[];
};

export type UploadRowError = {
  rowIndex: number;
  employeeId: number | null;
  workEmail: string | null;
  employmentNumber: string | null;
  employeeName: string | null;
  errorClass: "validation" | "processing";
  fieldName: string | null;
  message: string;
  fieldId: number | null;
  dbTable: string | null;
  dbColumn: string | null;
  validationRule: string | null;
  stagingPresent: boolean;
  isOrphan: boolean;
};

export type UploadRowErrorResult = {
  parseError: string | null;
  totalMatched: number;
  rows: UploadRowError[];
};

export type UploadBatchRow = {
  processedBatchResultId: number;
  uploadId: number;
  uploadSectionId: number | null;
  batchNumber: number | null;
  status: string | null;
  createdDate: string | null;
};

export type UploadBatchDetail = UploadBatchRow & {
  employeeDataPreview: string | null;
  resultPreview: string | null;
};

export type UploadExecutionError = {
  logId: number;
  logType: string;
  procedureName: string;
  batchNumber: number | null;
  uploadSectionId: number | null;
  sectionId: string | null;
  employeeId: number | null;
  workEmail: string | null;
  errorNumber: number | null;
  errorLine: number | null;
  errorMessage: string | null;
  dynamicSql: string | null;
  createdDate: string | null;
};

export type CreationStagingRow = {
  emailId: string | null;
  employeeId: number | null;
  employmentNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  isOrphan: boolean;
};

export type CreationStagingSummary = {
  stagingCount: number;
  orphanCount: number;
  orphans: CreationStagingRow[];
};

export type CreationFinalize = {
  uploadId: number;
  status: string | null;
  employmentNumbersPreview: string | null;
  finalizedResultPreview: string | null;
};

export type UploadLiveRow = {
  employeeId: number;
  employmentNumber: string | null;
  fullName: string | null;
  workEmail: string | null;
  isActive: string | boolean | null;
};
