export const ELMAH_LIST_COLUMNS = `
  Error.ErrorId,
  Error.Sequence,
  Error.Type,
  Error.Message,
  Error.[User] AS UserName,
  Error.StatusCode,
  Error.TimeUtc
`;

const DETAIL_ATTRIBUTE = /\bdetail="([^"]*)"/i;
const STACK_ELEMENT = /<stackTrace>([\s\S]*?)<\/stackTrace>/i;

export function shortExceptionType(type: string | null | undefined): string {
  const trimmed = type?.trim() ?? "";
  if (!trimmed) {
    return "Exception";
  }
  const parts = trimmed.split(".");
  return parts[parts.length - 1] || trimmed;
}

export function extractElmahStack(xml: string | null | undefined): string {
  const source = xml ?? "";
  const attribute = DETAIL_ATTRIBUTE.exec(source);
  const element = attribute ? null : STACK_ELEMENT.exec(source);
  const raw = attribute?.[1] ?? element?.[1] ?? "";
  const stack = unescapeXml(raw).trim();
  if (!stack) {
    return "No stack trace was stored.";
  }
  return stack.length > 12_000 ? `${stack.slice(0, 12_000)}…` : stack;
}

function unescapeXml(value: string): string {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) =>
      String.fromCodePoint(Number(dec)),
    )
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
