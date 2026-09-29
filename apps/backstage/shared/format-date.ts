import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

export const DEFAULT_DATE_FORMAT = "DD-MMM-YYYY";
export const DEFAULT_DATETIME_FORMAT = "DD-MMM-YYYY HH:mm:ss";

function hasClockTime(parsed: dayjs.Dayjs): boolean {
  return (
    parsed.hour() !== 0 ||
    parsed.minute() !== 0 ||
    parsed.second() !== 0 ||
    parsed.millisecond() !== 0
  );
}

export function formatDate(
  value: string | Date | number | null | undefined,
  format?: string,
): string {
  if (value == null || value === "") {
    return "—";
  }
  const parsed = dayjs.utc(value);
  if (!parsed.isValid()) {
    return "—";
  }
  if (format) {
    return parsed.format(format);
  }
  return parsed.format(
    hasClockTime(parsed) ? DEFAULT_DATETIME_FORMAT : DEFAULT_DATE_FORMAT,
  );
}
