import type {
  BoundProcedureParameter,
  ProcedureParameterDescriptor,
} from './types.js';

const STRING_LIKE_TYPES = new Set([
  'varchar',
  'nvarchar',
  'char',
  'nchar',
  'text',
  'ntext',
  'xml',
  'json',
  'sysname',
]);

const INTEGER_TYPES = new Set(['int', 'bigint', 'smallint', 'tinyint']);
const DECIMAL_TYPES = new Set(['decimal', 'numeric', 'money', 'smallmoney', 'float', 'real']);
const DATETIME_TYPES = new Set([
  'date',
  'datetime',
  'datetime2',
  'smalldatetime',
  'datetimeoffset',
  'time',
]);
const BINARY_TYPES = new Set(['binary', 'varbinary', 'image', 'timestamp', 'rowversion']);
const UNSUPPORTED_TYPES = new Set(['geography', 'geometry', 'hierarchyid', 'sql_variant']);
const UUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export interface PayloadMappingResult {
  readonly ok: boolean;
  readonly boundParameters: readonly BoundProcedureParameter[];
  readonly unmatchedPayloadKeys: readonly string[];
  readonly omittedParameters: readonly string[];
  readonly warnings: readonly string[];
  readonly error: string | null;
}

export function normalizeParameterName(name: string): string {
  const trimmed = name.trim();
  const withoutAt = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  return withoutAt.toLowerCase();
}

export function parseProcedurePayload(payload: unknown): Record<string, unknown> {
  if (typeof payload === 'string') {
    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch {
      throw new Error('Payload string is not valid JSON.');
    }

    if (!isPlainObject(parsed)) {
      throw new Error('Payload JSON must parse to an object.');
    }

    return parsed;
  }

  if (!isPlainObject(payload)) {
    throw new Error('Payload must be a JSON object or a JSON object string.');
  }

  return payload;
}

export function buildNamedExecSql(
  schema: string,
  name: string,
  boundParameters: readonly BoundProcedureParameter[],
): string {
  const procedure = `${quoteSqlIdentifier(schema)}.${quoteSqlIdentifier(name)}`;
  if (boundParameters.length === 0) {
    return `EXEC ${procedure}`;
  }

  const args = boundParameters.map((parameter) => {
    const parameterName = parameter.name.startsWith('@') ? parameter.name : `@${parameter.name}`;
    const outputSuffix = parameter.mode === 'out' || parameter.mode === 'inout' ? ' OUTPUT' : '';
    return `${parameterName} = ${parameterName}${outputSuffix}`;
  });

  return `EXEC ${procedure} ${args.join(', ')}`;
}

export function quoteSqlIdentifier(value: string): string {
  return `[${value.replaceAll(']', ']]')}]`;
}

export function assertSqlIdentifier(value: string, label: string): void {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`${label} "${value}" is not a valid SQL identifier.`);
  }
}

export function mapPayloadToProcedureParameters(
  parameters: readonly ProcedureParameterDescriptor[],
  payload: Record<string, unknown>,
): PayloadMappingResult {
  const parameterNames = new Map<string, ProcedureParameterDescriptor>();
  for (const parameter of parameters) {
    const normalized = normalizeParameterName(parameter.name);
    if (parameterNames.has(normalized)) {
      return mappingError(
        `Procedure parameters "${parameterNames.get(normalized)?.name}" and "${parameter.name}" both map to the same name.`,
      );
    }

    parameterNames.set(normalized, parameter);
  }

  const payloadByNormalizedName = new Map<string, { key: string; value: unknown }>();
  for (const [key, value] of Object.entries(payload)) {
    const normalized = normalizeParameterName(key);
    if (!normalized) {
      return mappingError(`Payload key "${key}" does not contain a parameter name.`);
    }

    const existing = payloadByNormalizedName.get(normalized);
    if (existing) {
      return mappingError(`Payload keys "${existing.key}" and "${key}" both map to the same parameter name.`);
    }

    payloadByNormalizedName.set(normalized, { key, value });
  }

  const boundParameters: BoundProcedureParameter[] = [];
  const omittedParameters: string[] = [];
  const matchedPayloadKeys = new Set<string>();

  for (const parameter of parameters) {
    const match = payloadByNormalizedName.get(normalizeParameterName(parameter.name));
    if (!match) {
      omittedParameters.push(parameter.name);
      continue;
    }

    matchedPayloadKeys.add(match.key);

    if (parameter.isTableType) {
      return mappingError(
        `Table-valued parameter ${parameter.name} (${parameter.dataType}) is not supported. Flatten or omit this key.`,
      );
    }

    try {
      boundParameters.push({
        name: parameter.name,
        dataType: parameter.dataType,
        sourceKey: match.key,
        value: coerceParameterValue(parameter, match.value, match.key),
        mode: parameter.mode ?? 'in',
      });
    } catch (error) {
      return mappingError(error instanceof Error ? error.message : String(error));
    }
  }

  const unmatchedPayloadKeys = Object.keys(payload).filter((key) => !matchedPayloadKeys.has(key));
  const warnings = unmatchedPayloadKeys.length > 0
    ? [`Unmatched payload keys: ${unmatchedPayloadKeys.join(', ')}.`]
    : [];

  return {
    ok: true,
    boundParameters,
    unmatchedPayloadKeys,
    omittedParameters,
    warnings,
    error: null,
  };
}

function coerceParameterValue(
  parameter: ProcedureParameterDescriptor,
  value: unknown,
  sourceKey: string,
): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  const systemType = parameter.systemType.trim().toLowerCase();
  if (UNSUPPORTED_TYPES.has(systemType)) {
    throw new Error(
      `Cannot bind payload key "${sourceKey}" to ${parameter.name} (${parameter.dataType}): type ${systemType} is not supported.`,
    );
  }

  if (isObjectOrArray(value)) {
    if (!STRING_LIKE_TYPES.has(systemType)) {
      throw new Error(
        `Cannot bind object/array payload key "${sourceKey}" to ${parameter.name} (${parameter.dataType}).`,
      );
    }

    return JSON.stringify(value);
  }

  if (STRING_LIKE_TYPES.has(systemType)) {
    return typeof value === 'string' ? value : String(value);
  }

  if (systemType === 'bit') {
    return coerceBit(value, parameter, sourceKey);
  }

  if (INTEGER_TYPES.has(systemType) || DECIMAL_TYPES.has(systemType)) {
    const numeric = parseNumeric(value);
    if (numeric === null) {
      throw new Error(
        `Cannot bind payload key "${sourceKey}" to ${parameter.name} (${parameter.dataType}): expected a number.`,
      );
    }

    return numeric;
  }

  if (DATETIME_TYPES.has(systemType)) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }

    if (typeof value === 'string' && value.trim() !== '') {
      return value;
    }

    throw new Error(
      `Cannot bind payload key "${sourceKey}" to ${parameter.name} (${parameter.dataType}): expected a date string.`,
    );
  }

  if (systemType === 'uniqueidentifier') {
    if (typeof value === 'string' && UUID_PATTERN.test(value.trim())) {
      return value.trim();
    }

    throw new Error(
      `Cannot bind payload key "${sourceKey}" to ${parameter.name} (${parameter.dataType}): expected a UUID string.`,
    );
  }

  if (BINARY_TYPES.has(systemType)) {
    if (typeof value === 'string') {
      return value;
    }

    throw new Error(
      `Cannot bind payload key "${sourceKey}" to ${parameter.name} (${parameter.dataType}): expected a string.`,
    );
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  throw new Error(
    `Cannot bind payload key "${sourceKey}" to ${parameter.name} (${parameter.dataType}).`,
  );
}

function coerceBit(
  value: unknown,
  parameter: ProcedureParameterDescriptor,
  sourceKey: string,
): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 0 || value === 1) {
    return value === 1;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') {
      return true;
    }

    if (normalized === 'false' || normalized === '0') {
      return false;
    }
  }

  throw new Error(
    `Cannot bind payload key "${sourceKey}" to ${parameter.name} (${parameter.dataType}): expected a boolean.`,
  );
}

function parseNumeric(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function mappingError(error: string): PayloadMappingResult {
  return {
    ok: false,
    boundParameters: [],
    unmatchedPayloadKeys: [],
    omittedParameters: [],
    warnings: [],
    error,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isObjectOrArray(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !(value instanceof Date);
}
