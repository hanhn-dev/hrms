import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { MESSAGE } from "@/shared/messaging";
import { DEVTOOLS_ATTACHED_ERROR } from "./debugger-error";
import { PAGE_NETWORK_CAPTURE_EMPTY_HINT } from "./NetworkTimingPanel";
import {
  RequestTimingOverlay,
  type RequestTimingSend,
} from "./RequestTimingOverlay";
import type { NetworkTimingRow } from "./timing";

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

globalThis.ResizeObserver = ResizeObserverStub;

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

function row(requestId: string, durationSeconds: number): NetworkTimingRow {
  return {
    requestId,
    url: `https://hrms.example/api/${requestId}`,
    method: "GET",
    resourceType: "XHR",
    initiatorLabel: "app.js:10",
    status: 200,
    cached: false,
    durationSeconds,
    waitingSeconds: 0.2,
    handlingSeconds: 0.15,
    startedAt: 1,
  };
}

describe("RequestTimingOverlay", () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    document.getElementById("form-autofill-toast")?.remove();
    root = undefined;
    container = undefined;
  });

  async function mount(sendMessage: RequestTimingSend, onClose = () => undefined) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(
        <RequestTimingOverlay sendMessage={sendMessage} onClose={onClose} />,
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  it("shows captured calls on the page without closing (positive)", async () => {
    const sendMessage = vi.fn(async (payload: unknown) => {
      if (
        typeof payload === "object" &&
        payload !== null &&
        "type" in payload &&
        payload.type === MESSAGE.GET_NETWORK_CAPTURE
      ) {
        return {
          ok: true as const,
          capturing: true,
          rows: [row("fast", 0.3), row("slow", 4.2)],
        };
      }
      return { ok: true as const, capturing: true, rows: [] };
    });

    await mount(sendMessage);
    const text = container!.textContent ?? "";
    expect(text.indexOf("https://hrms.example/api/slow")).toBeLessThan(
      text.indexOf("https://hrms.example/api/fast"),
    );
    expect(text).toContain("app.js:10");
    expect(container!.querySelector("[data-request-timing-panel]")?.getAttribute("style")).toContain(
      "position: fixed",
    );
  });

  it("shows the DevTools attach error instead of throwing (negative)", async () => {
    const sendMessage = vi.fn(async (payload: unknown) => {
      if (
        typeof payload === "object" &&
        payload !== null &&
        "type" in payload &&
        payload.type === MESSAGE.START_NETWORK_CAPTURE
      ) {
        return { ok: false as const, error: DEVTOOLS_ATTACHED_ERROR };
      }
      return { ok: true as const, capturing: false, rows: [] };
    });

    await mount(sendMessage);
    const start = Array.from(container!.querySelectorAll("button")).find(
      (button) => button.textContent === "Start capture",
    );
    expect(start).toBeTruthy();
    await act(async () => {
      start!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(container!.textContent).toContain(DEVTOOLS_ATTACHED_ERROR);
    expect(document.getElementById("form-autofill-toast")?.textContent).toContain(
      "DevTools",
    );
  });

  it("shows the empty hint and closes only from the Close button (edge)", async () => {
    const onClose = vi.fn();
    await mount(async () => ({ ok: true, capturing: false, rows: [] }), onClose);
    expect(container!.textContent).toContain(PAGE_NETWORK_CAPTURE_EMPTY_HINT);

    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onClose).not.toHaveBeenCalled();

    const close = container!.querySelector(
      '[aria-label="Close request timing"]',
    ) as HTMLButtonElement;
    await act(async () => {
      close.click();
    });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
