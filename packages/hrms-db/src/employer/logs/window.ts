export const LOG_PAGE_SIZE = 50;
export const LOG_MAX_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
export const LOG_DEFAULT_WINDOW_MS = 24 * 60 * 60 * 1000;

export type LogWindow = {
  from: Date;
  to: Date;
  limited: boolean;
};

export function clampLogWindow(from: Date, to: Date): LogWindow {
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error("Log window dates are invalid.");
  }
  let end = to.getTime() < from.getTime() ? from : to;
  let limited = end !== to;
  if (end.getTime() - from.getTime() > LOG_MAX_WINDOW_MS) {
    end = new Date(from.getTime() + LOG_MAX_WINDOW_MS);
    limited = true;
  }
  return { from, to: end, limited };
}
