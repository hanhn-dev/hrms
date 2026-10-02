export type TableRefreshOutcome = "skipped" | "custom" | "page";

export function runTableRefresh(options: {
  onRefresh?: () => void | Promise<void>;
  skip?: boolean;
  refreshPage: () => void;
}): TableRefreshOutcome {
  if (options.skip) {
    return "skipped";
  }
  if (options.onRefresh) {
    void options.onRefresh();
    return "custom";
  }
  options.refreshPage();
  return "page";
}
