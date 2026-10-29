export function rethrowRedirect(error: unknown): void {
  if (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  ) {
    throw error;
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "Could not reach Azure DevOps";
}

export function shortCommit(commitId: string): string {
  return commitId.slice(0, 8);
}

export function displayGitPath(path: string): string {
  const slashed = path.trim().replace(/\\/g, "/");
  if (slashed.length === 0 || slashed === "/") {
    return "";
  }
  return slashed.startsWith("/") ? slashed : `/${slashed}`;
}

export function firstCommitLine(comment: string | null): string {
  const line = comment?.split("\n")[0]?.trim();
  return line && line.length > 0 ? line : "—";
}
