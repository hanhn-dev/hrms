export function cursorFileUrl(absoluteFile: string, line: number, column: number): string {
  const file = encodeURI(absoluteFile.replaceAll("\\", "/"));
  return `cursor://file/${file}:${line}:${column}`;
}

export function followEditor(absoluteFile: string, line: number, column: number): void {
  window.location.assign(cursorFileUrl(absoluteFile, line, column));
}
