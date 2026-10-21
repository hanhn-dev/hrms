const URL_PARSE_DEPRECATION = "DEP0169";

type ProcessWarning = Error & { code?: string };

/**
 * Node still prints process warnings to stderr when a listener is attached.
 * Drop the default printer first, then ignore only the Azure SDK's
 * `url.parse()` deprecation and forward every other warning.
 */
export function shouldIgnoreProcessWarning(warning: ProcessWarning): boolean {
  return (
    warning.name === "DeprecationWarning" &&
    warning.code === URL_PARSE_DEPRECATION
  );
}

export function installProcessWarningFilter(): void {
  process.removeAllListeners("warning");
  process.on("warning", (warning: ProcessWarning) => {
    if (shouldIgnoreProcessWarning(warning)) {
      return;
    }
    console.warn(warning);
  });
}
