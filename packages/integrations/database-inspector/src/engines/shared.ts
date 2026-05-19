import type { ConnectionValue, DatabaseEngine, OperationResult } from '../types.js';

export function asString(value: ConnectionValue): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function asNumber(value: ConnectionValue): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

export function asBoolean(value: ConnectionValue, defaultValue = false): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }

  return defaultValue;
}

export function normalizeErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }

  return fallback;
}

export function buildObjectId(schema: string, name: string): string {
  return schema ? `${schema}.${name}` : String(name);
}

export function normalizeDefinition(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.replace(/\r\n?/g, '\n').trim();
  return normalized || undefined;
}

export function normalizeRoutineParameterMode(value: unknown): 'in' | 'out' | 'inout' | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'in/out' || normalized === 'inout' || normalized === 'in out') {
    return 'inout';
  }
  if (normalized === 'out') {
    return 'out';
  }
  if (normalized === 'in') {
    return 'in';
  }

  return undefined;
}

export function createOperationErrorResult(
  engine: DatabaseEngine,
  operation: string,
  error: unknown,
  affectedObjects: readonly string[] = [],
  warnings: readonly string[] = [],
): OperationResult {
  const message = normalizeErrorMessage(error, `Unable to complete ${operation}.`);

  return {
    ok: false,
    operation,
    engine,
    affectedObjects,
    sql: [],
    message,
    warnings,
    error: message,
  };
}
