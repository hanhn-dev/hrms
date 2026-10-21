export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { installProcessWarningFilter } = await import(
      "./instrumentation-node"
    );
    installProcessWarningFilter();
  }
}
