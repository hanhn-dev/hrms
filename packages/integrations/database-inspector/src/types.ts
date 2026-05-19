export type DatabaseEngine = 'sqlserver' | 'mysql' | 'postgres' | 'oracle' | 'sqlite';

export type ConnectionValue = string | number | boolean | null | undefined;
export type ConnectionValues = Record<string, ConnectionValue>;

export type DatabaseObjectKind = 'table' | 'view' | 'storedProcedure' | 'trigger' | 'function' | 'sequence';
export type DependencySupport = 'full' | 'partial' | 'none';

export interface DatabaseMcpConfig {
  readonly engine: DatabaseEngine;
  readonly connectionString: string | undefined;
  readonly host: string | undefined;
  readonly port: number | undefined;
  readonly database: string | undefined;
  readonly user: string | undefined;
  readonly password: string | undefined;
  readonly schema: string | undefined;
  readonly ssl: boolean;
  readonly trustServerCertificate: boolean;
  readonly sqlitePath: string | undefined;
}

export interface DatabaseRelationshipEndpoint {
  readonly objectId: string;
  readonly column: string;
}

export interface DatabaseRelationship {
  readonly id: string;
  readonly from: DatabaseRelationshipEndpoint;
  readonly to: DatabaseRelationshipEndpoint;
  readonly label: string;
}

export interface DatabaseObjectSummary {
  readonly id: string;
  readonly schema: string;
  readonly name: string;
  readonly kind: DatabaseObjectKind;
  readonly definitionAvailable: boolean;
  readonly dependencySupport: DependencySupport;
}

export interface DatabaseCatalog {
  readonly engine: DatabaseEngine;
  readonly schemas: readonly string[];
  readonly objects: readonly DatabaseObjectSummary[];
  readonly relationships: readonly DatabaseRelationship[];
  readonly warnings: readonly string[];
}

export interface CatalogQuery {
  readonly schema?: string;
  readonly kinds?: readonly DatabaseObjectKind[];
  readonly includeRelationships?: boolean;
}

export interface RoutineParameter {
  readonly name: string;
  readonly dataType: string;
  readonly mode?: 'in' | 'out' | 'inout';
  readonly hasDefault?: boolean;
}

export interface DatabaseColumn {
  readonly name: string;
  readonly dataType: string;
  readonly nullable: boolean;
  readonly primaryKey?: boolean;
}

export interface DependencySummary {
  readonly objectId: string;
  readonly operation: 'select' | 'insert' | 'update' | 'delete' | 'execute';
}

export interface DatabaseObjectDetails {
  readonly object: DatabaseObjectSummary;
  readonly columns: readonly DatabaseColumn[];
  readonly parameters: readonly RoutineParameter[];
  readonly definition: string | null;
  readonly definitionUnavailableReason: string | null;
  readonly dependencies: readonly DependencySummary[];
  readonly dependents: readonly DependencySummary[];
  readonly relationships: readonly DatabaseRelationship[];
  readonly warnings: readonly string[];
}

export interface ObjectDetailsRequest {
  readonly schema: string;
  readonly name: string;
  readonly kind: DatabaseObjectKind;
  readonly includeDependents?: boolean;
}

export interface CreateTableColumn {
  readonly name: string;
  readonly dataType: string;
  readonly nullable: boolean;
  readonly primaryKey?: boolean;
  readonly unique?: boolean;
  readonly defaultValue?: string;
}

export interface CreateTableRequest {
  readonly schema: string | undefined;
  readonly name: string;
  readonly columns: readonly CreateTableColumn[];
  readonly primaryKey: readonly string[] | undefined;
  readonly ifNotExists: boolean;
}

export interface AlterColumnPatch {
  readonly name: string;
  readonly nextName?: string;
  readonly dataType?: string;
  readonly nullable?: boolean;
  readonly defaultValue?: string | null;
}

export interface TableConstraintRequest {
  readonly name: string;
  readonly kind: 'primaryKey' | 'unique' | 'check' | 'foreignKey';
  readonly columns?: readonly string[];
  readonly expression?: string;
}

export interface AlterTableRequest {
  readonly schema: string | undefined;
  readonly name: string;
  readonly renameTo: string | undefined;
  readonly addColumns: readonly CreateTableColumn[];
  readonly alterColumns: readonly AlterColumnPatch[];
  readonly dropColumns: readonly string[];
  readonly addConstraints: readonly TableConstraintRequest[];
  readonly dropConstraints: readonly string[];
}

export interface RelationshipMutationRequest {
  readonly fromSchema: string | undefined;
  readonly fromTable: string;
  readonly fromColumn: string;
  readonly toSchema: string | undefined;
  readonly toTable: string;
  readonly toColumn: string;
  readonly constraintName?: string;
  readonly onDelete?: 'cascade' | 'setNull' | 'restrict' | 'noAction';
  readonly onUpdate?: 'cascade' | 'setNull' | 'restrict' | 'noAction';
}

export interface StoredProcedureInsight {
  readonly schema: string;
  readonly name: string;
  readonly script: string | null;
  readonly scriptUnavailableReason: string | null;
  readonly dependencies: readonly DependencySummary[];
  readonly dependents: readonly DependencySummary[];
  readonly warnings: readonly string[];
}

export interface StoredProcedureRequest {
  readonly schema: string;
  readonly name: string;
  readonly includeDependents?: boolean;
}

export interface OperationResult {
  readonly ok: boolean;
  readonly operation: string;
  readonly engine: DatabaseEngine;
  readonly affectedObjects: readonly string[];
  readonly sql: readonly string[];
  readonly message: string;
  readonly warnings: readonly string[];
  readonly error: string | null;
}
