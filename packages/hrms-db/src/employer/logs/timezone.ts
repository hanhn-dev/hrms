export type TimeZoneOffset = {
  label: string;
  offsetMinutes: number;
};

const WINDOWS_OFFSET = /\(UTC(?:([+-])(\d{2}):(\d{2}))?\)/i;

export function parseWindowsTimeZoneOffset(
  timeZone: string | null | undefined,
): TimeZoneOffset | null {
  if (!timeZone) {
    return null;
  }
  const match = WINDOWS_OFFSET.exec(timeZone);
  if (!match) {
    return null;
  }
  if (!match[1]) {
    return { label: "UTC", offsetMinutes: 0 };
  }
  const sign = match[1] === "-" ? -1 : 1;
  const offsetMinutes = sign * (Number(match[2]) * 60 + Number(match[3]));
  return {
    label: `UTC${match[1]}${match[2]}:${match[3]}`,
    offsetMinutes,
  };
}

export function serverLocalBound(utc: Date, offsetMinutes: number): Date {
  return new Date(utc.getTime() + offsetMinutes * 60_000);
}
