import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

export const DEFAULT_DATE_FORMAT = "DD-MMM-YYYY";

export function formatDate(
  value: string | Date | number | null | undefined,
  format: string = DEFAULT_DATE_FORMAT,
): string {
  if (value == null || value === "") {
    return "—";
  }
  const parsed = dayjs.utc(value);
  if (!parsed.isValid()) {
    return "—";
  }
  return parsed.format(format);
}
