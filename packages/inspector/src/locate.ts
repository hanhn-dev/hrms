export type SourceLocation = {
  file: string;
  line: number;
  column: number;
  absolute?: string;
};

export function locateSource(element: Element): SourceLocation | null {
  const host = element.closest("[data-insp-path]");
  if (!(host instanceof Element)) return null;
  const file = host.getAttribute("data-insp-path");
  const line = positiveInteger(host.getAttribute("data-insp-line"));
  const column = positiveInteger(host.getAttribute("data-insp-column"));
  if (file == null || file === "" || line == null || column == null) return null;
  const absolute = host.getAttribute("data-insp-file");
  return absolute == null || absolute === "" ? { file, line, column } : { file, line, column, absolute };
}

function positiveInteger(value: string | null): number | null {
  if (value == null || !/^[1-9]\d*$/.test(value)) return null;
  return Number(value);
}
