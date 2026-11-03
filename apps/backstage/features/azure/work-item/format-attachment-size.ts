/** Format a byte count for attachment lists (e.g. 1.5 KB). */
export function formatAttachmentSize(size: number | null | undefined): string {
  if (size == null || !Number.isFinite(size) || size < 0) {
    return "—";
  }
  if (size < 1024) {
    return `${Math.round(size)} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(size < 10 * 1024 ? 1 : 0)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(size < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}
