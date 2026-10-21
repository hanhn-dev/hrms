/** True when the mssql/Prisma driver lost the TCP socket and a fresh pool may succeed. */
export function isTransientDbConnectionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code =
    "code" in error && error.code != null ? String(error.code) : "";
  const message =
    "message" in error && error.message != null ? String(error.message) : "";
  if (
    code === "ESOCKET" ||
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "ETIMEOUT" ||
    code === "P1017"
  ) {
    return true;
  }
  return /connection lost|socket hang up|ECONNRESET|server closed the connection/i.test(
    message,
  );
}
