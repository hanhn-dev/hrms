/// <reference path="./external-modules.d.ts" />

export type {
  AlterColumnPatch,
  AlterTableRequest,
  CatalogQuery,
  ConnectionValue,
  ConnectionValues,
  CreateTableColumn,
  CreateTableRequest,
  DatabaseCatalog,
  DatabaseColumn,
  DatabaseEngine,
  DatabaseMcpConfig,
  DatabaseObjectDetails,
  DatabaseObjectKind,
  DatabaseObjectSummary,
  DatabaseRelationship,
  DependencySummary,
  DependencySupport,
  ObjectDetailsRequest,
  OperationResult,
  RelationshipMutationRequest,
  RoutineParameter,
  StoredProcedureRequest,
  StoredProcedureInsight,
  TableConstraintRequest,
} from './types.js';
export { loadConfig } from './config.js';
export { asBoolean, asNumber, asString, createOperationErrorResult, normalizeErrorMessage } from './engines/shared.js';
export type { EngineConnectionValues } from './engines/types.js';
export { getCatalog } from './catalog.js';
export { getObjectDetails } from './object-details.js';
export { getStoredProcedureDependencies, getStoredProcedureScript } from './procedures.js';
export { createTable } from './mutations/create-table.js';
export { alterTable } from './mutations/alter-table.js';
export { addRelationship } from './mutations/add-relationship.js';
