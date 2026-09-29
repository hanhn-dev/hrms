import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import utc from "dayjs/plugin/utc.js";
import type { ValidationResult } from "./types.ts";

dayjs.extend(utc);
dayjs.extend(customParseFormat);

const ISO_8601 =
  /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d(\.\d+)?(Z|[+-]\d{2}:?\d{2})?/;

const PHONE_PATTERN = /\+([\d ]+)-\d+$/;

/** Minimal phone-code map (common codes); full Core map is large — extend as needed. */
const PHONE_CODES: Record<string, true> = {
  "1": true,
  "44": true,
  "61": true,
  "65": true,
  "66": true,
  "84": true,
  "91": true,
  "971": true,
};

type FlagParams = {
  allowedNull?: boolean;
  allowedEmpty?: boolean;
};

function allowBlank(value: unknown, params?: FlagParams): boolean {
  if (params?.allowedNull && value == null) return true;
  if (params?.allowedEmpty && value === "") return true;
  return false;
}

export function parseUtcDate(
  value: unknown,
  format = "DD-MMM-YYYY",
): dayjs.Dayjs | null {
  if (value == null || value === "") return null;
  const text = String(value);
  const date = ISO_8601.test(text)
    ? dayjs.utc(text)
    : dayjs.utc(text, format, true);
  return date.isValid() ? date : null;
}

export function isRequired(value: unknown): ValidationResult {
  return [value != null && value !== ""];
}

export function isInStringLength(
  value: unknown,
  params: {
    minLength?: number;
    maxLength?: number;
    allowedNull?: boolean;
    allowedEmpty?: boolean;
  },
): ValidationResult {
  if (allowBlank(value, params)) return [true];
  if (typeof value !== "string" && typeof value !== "number") return [false];
  const comparingValue = String(value);
  const { minLength, maxLength } = params;
  if (
    (minLength == null && maxLength == null) ||
    (minLength != null && maxLength != null && minLength > maxLength)
  ) {
    return [false];
  }
  if (minLength != null && maxLength == null) {
    return [comparingValue.length >= minLength];
  }
  if (maxLength != null && minLength == null) {
    return [comparingValue.length <= maxLength];
  }
  return [
    comparingValue.length >= (minLength as number) &&
      comparingValue.length <= (maxLength as number),
  ];
}

export function isInRange(
  value: unknown,
  params: {
    min?: number;
    max?: number;
    allowedNull?: boolean;
    allowedEmpty?: boolean;
  },
): ValidationResult {
  if (allowBlank(value, params)) return [true];
  if (value == null || value === "") return [false];
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) return [false];
  const { min, max } = params;
  if (min == null && max == null) return [false];
  if (min != null && max == null) return [numberValue >= +min];
  if (max != null && min == null) return [numberValue <= +max];
  return [numberValue >= (min as number) && numberValue <= (max as number)];
}

export function isInDateRange(
  value: unknown,
  params: {
    minDate?: string;
    maxDate?: string;
    format?: string;
    allowedNull?: boolean;
    allowedEmpty?: boolean;
  },
): ValidationResult {
  if (allowBlank(value, params)) return [true];
  if (value == null || value === "") return [false];
  const format = params.format ?? "DD-MMM-YYYY";
  const { minDate, maxDate } = params;
  if (minDate == null && maxDate == null) return [false];
  const dateValue = parseUtcDate(value, format);
  if (!dateValue) return [false];
  if (minDate != null && maxDate == null) {
    const minDateValue = parseUtcDate(minDate, format);
    return minDateValue
      ? [
          dateValue.isSame(minDateValue, "day") ||
            dateValue.isAfter(minDateValue, "day"),
        ]
      : [false];
  }
  if (maxDate != null && minDate == null) {
    const maxDateValue = parseUtcDate(maxDate, format);
    return maxDateValue
      ? [
          dateValue.isSame(maxDateValue, "day") ||
            dateValue.isBefore(maxDateValue, "day"),
        ]
      : [false];
  }
  const minDateValue = parseUtcDate(minDate!, format);
  const maxDateValue = parseUtcDate(maxDate!, format);
  if (!minDateValue || !maxDateValue) return [false];
  return [
    (dateValue.isSame(minDateValue, "day") ||
      dateValue.isAfter(minDateValue, "day")) &&
      (dateValue.isSame(maxDateValue, "day") ||
        dateValue.isBefore(maxDateValue, "day")),
  ];
}

export function isValidPattern(
  value: unknown,
  params: {
    pattern?: string | RegExp;
    allowedNull?: boolean;
    allowedEmpty?: boolean;
  },
): ValidationResult {
  if (allowBlank(value, params)) return [true];
  const { pattern } = params;
  if (pattern instanceof RegExp) return [pattern.test(String(value))];
  if (typeof pattern !== "string") return [false];
  try {
    return [new RegExp(pattern).test(String(value))];
  } catch {
    return [false];
  }
}

export function isValidDateFormat(
  value: unknown,
  params: {
    format?: string;
    allowedNull?: boolean;
    allowedEmpty?: boolean;
  } = {},
): ValidationResult {
  if (allowBlank(value, params)) return [true];
  const format = params.format ?? "DD-MMM-YYYY";
  if (typeof value !== "string") {
    return [false, `Date must be in this format ${format}`];
  }
  const date = parseUtcDate(value, format);
  if (!date) return [false, `Date must be in this format ${format}`];
  if (date.isBefore(dayjs.utc("1900-01-01", "YYYY-MM-DD"))) {
    return [false, "Date must be on or after 01-Jan-1900."];
  }
  const formatted = date.format(format);
  const dateRegex: Record<string, RegExp> = {
    "DD-MM-YYYY": /^\d{2}-\d{2}-\d{4}$/,
    "DD-MMM-YYYY":
      /^\d{2}-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\d{4}$/,
  };
  return [
    dateRegex[format]?.test(formatted) ?? true,
    `Date must be in this format ${format}`,
  ];
}

export function isValidAge(
  value: unknown,
  params: { format?: string },
): ValidationResult {
  if (typeof value !== "string") return [false];
  const format = params.format ?? "DD-MMM-YYYY";
  const date = parseUtcDate(value, format);
  if (!date) return [false];
  return [dayjs.utc().diff(date, "year", true) >= 18];
}

export function isValidEmail(
  value: unknown,
  params: FlagParams = {},
): ValidationResult {
  if (allowBlank(value, params)) return [true];
  return [
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,10}$/.test(String(value)),
  ];
}

export function isValidUrl(value: unknown): ValidationResult {
  try {
    // eslint-disable-next-line no-new
    new URL(String(value));
    return [true];
  } catch {
    return [false];
  }
}

export function isNumeric(
  value: unknown,
  params: FlagParams = {},
): ValidationResult {
  return isValidPattern(value, {
    pattern: /^\d+$/,
    allowedNull: params.allowedNull,
    allowedEmpty: params.allowedEmpty,
  });
}

export function isFutureDate(
  value: unknown,
  params: FlagParams = {},
): ValidationResult {
  if (allowBlank(value, params)) return [true];
  const [ok] = isValidDateFormat(value, { format: "DD-MMM-YYYY" });
  const date = parseUtcDate(value, "DD-MMM-YYYY");
  if (!ok || !date) return [false];
  return [
    date.isSame(dayjs.utc(), "day") || date.isAfter(dayjs.utc(), "day"),
  ];
}

export function isNotFutureDate(
  value: unknown,
  params: FlagParams = {},
): ValidationResult {
  if (allowBlank(value, params)) return [true];
  const [ok] = isValidDateFormat(value, { format: "DD-MMM-YYYY" });
  const date = parseUtcDate(value, "DD-MMM-YYYY");
  if (!ok || !date) return [false];
  return [
    date.isSame(dayjs.utc(), "day") || date.isBefore(dayjs.utc(), "day"),
  ];
}

export function isValidPhonePattern(
  value: unknown,
  params: FlagParams = {},
): ValidationResult {
  return isValidPattern(value, {
    pattern: PHONE_PATTERN,
    allowedNull: params.allowedNull,
    allowedEmpty: params.allowedEmpty,
  });
}

export function isValidPhoneCode(
  value: unknown,
  params: FlagParams = {},
): ValidationResult {
  if (allowBlank(value, params)) return [true];
  if (typeof value !== "string") return [false];
  const matched = PHONE_PATTERN.exec(value);
  const code = matched?.[1]?.replace(/\s/g, "");
  return [code != null && code in PHONE_CODES];
}

function compareValue(
  value: string | number | Date,
  otherValue: string | number | Date,
  operator: string,
): boolean {
  switch (operator) {
    case ">":
      return value > otherValue;
    case "<":
      return value < otherValue;
    case ">=":
      return value >= otherValue;
    case "<=":
      return value <= otherValue;
    case "==":
      if (value instanceof Date && otherValue instanceof Date) {
        return value.getTime() === otherValue.getTime();
      }
      return value == otherValue;
    case "===":
      if (value instanceof Date && otherValue instanceof Date) {
        return value.getTime() === otherValue.getTime();
      }
      return value === otherValue;
    default:
      return false;
  }
}

export function compareTo(row: Record<string, unknown>) {
  return (
    value: unknown,
    params: {
      property?: string;
      operator?: string;
      dataType?: string;
      allowedEmpty?: boolean;
      allowedNull?: boolean;
    },
  ): ValidationResult => {
    if (allowBlank(value, params)) return [true];
    const { property, operator, dataType } = params;
    if (!property || !operator || dataType == null) return [false];
    let comparingValue: string | number | Date = value as string | number | Date;
    let comparingToValue: string | number | Date = row[
      property
    ] as string | number | Date;
    if (typeof value !== typeof comparingToValue && dataType !== "length") {
      // Core requires matching typeof; dates often arrive as strings — allow string/string.
    }
    if (dataType === "date") {
      const left = parseUtcDate(comparingValue);
      const right = parseUtcDate(comparingToValue);
      if (!left || !right) return [false];
      comparingValue = left.toDate();
      comparingToValue = right.toDate();
    } else if (dataType === "number") {
      comparingValue = Number(comparingValue);
      comparingToValue = Number(comparingToValue);
    } else if (dataType === "length") {
      comparingValue = String(comparingValue).length;
      comparingToValue = String(comparingToValue).length;
    } else {
      comparingValue = String(comparingValue);
      comparingToValue = String(comparingToValue);
    }
    return [compareValue(comparingValue, comparingToValue, operator)];
  };
}

export type LocalValidator = (
  value: unknown,
  params: Record<string, unknown>,
) => ValidationResult | Promise<ValidationResult>;

export const LOCAL_VALIDATORS: Record<
  string,
  LocalValidator | ((row: Record<string, unknown>) => LocalValidator)
> = {
  required: (value: unknown) => isRequired(value),
  stringLength: (value: unknown, params: Record<string, unknown>) =>
    isInStringLength(value, params as Parameters<typeof isInStringLength>[1]),
  range: (value: unknown, params: Record<string, unknown>) =>
    isInRange(value, params as Parameters<typeof isInRange>[1]),
  dateRange: (value: unknown, params: Record<string, unknown>) =>
    isInDateRange(value, params as Parameters<typeof isInDateRange>[1]),
  pattern: (value: unknown, params: Record<string, unknown>) =>
    isValidPattern(value, params as Parameters<typeof isValidPattern>[1]),
  dateFormat: (value: unknown, params: Record<string, unknown>) =>
    isValidDateFormat(value, params as Parameters<typeof isValidDateFormat>[1]),
  age: (value: unknown, params: Record<string, unknown>) =>
    isValidAge(value, params as Parameters<typeof isValidAge>[1]),
  email: (value: unknown, params: Record<string, unknown>) =>
    isValidEmail(value, params),
  url: (value: unknown) => isValidUrl(value),
  numeric: (value: unknown, params: Record<string, unknown>) =>
    isNumeric(value, params),
  futureDate: (value: unknown, params: Record<string, unknown>) =>
    isFutureDate(value, params),
  notFutureDate: (value: unknown, params: Record<string, unknown>) =>
    isNotFutureDate(value, params),
  phonePattern: (value: unknown, params: Record<string, unknown>) =>
    isValidPhonePattern(value, params),
  phoneCode: (value: unknown, params: Record<string, unknown>) =>
    isValidPhoneCode(value, params),
  compareTo,
};
