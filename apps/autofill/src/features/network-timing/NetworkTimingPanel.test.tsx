import { createRoot, type Root } from "react-dom/client";
import { act, type ComponentProps } from "react";
import { NetworkTimingPanel, NETWORK_CAPTURE_EMPTY_HINT } from "./NetworkTimingPanel";
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

function row(
  partial: Partial<NetworkTimingRow> & Pick<NetworkTimingRow, "requestId">,
): NetworkTimingRow {
  return {
    url: `https://hrms.example/${partial.requestId}`,
    method: "GET",
    resourceType: "XHR",
    initiatorLabel: "app.js:10",
    status: 200,
    cached: false,
    durationSeconds: 0.2,
    waitingSeconds: 0.1,
    handlingSeconds: null,
    startedAt: 1,
    ...partial,
  };
}

describe("NetworkTimingPanel", () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = undefined;
    container = undefined;
  });

  function mount(
    props: Partial<ComponentProps<typeof NetworkTimingPanel>> = {},
  ): void {
    act(() => {
      root?.unmount();
    });
    container?.remove();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root!.render(
        <NetworkTimingPanel
          capturing={false}
          busy={false}
          rows={[]}
          showAllTypes={false}
          onStart={() => undefined}
          onStop={() => undefined}
          onShowAllTypesChange={() => undefined}
          {...props}
        />,
      );
    });
  }

  it("lists the slower API call first with its initiator (positive)", () => {
    mount({
      capturing: true,
      rows: [
        row({
          requestId: "fast",
          url: "https://hrms.example/api/fast",
          durationSeconds: 0.3,
          waitingSeconds: 0.1,
          handlingSeconds: 0.05,
        }),
        row({
          requestId: "slow",
          url: "https://hrms.example/api/slow",
          durationSeconds: 4.2,
          waitingSeconds: 3.8,
          handlingSeconds: 3.6,
          initiatorLabel: "app.js:10",
          cached: true,
          method: "POST",
        }),
      ],
    });
    const text = container!.textContent ?? "";
    expect(text.indexOf("https://hrms.example/api/slow")).toBeGreaterThan(-1);
    expect(text.indexOf("https://hrms.example/api/slow")).toBeLessThan(
      text.indexOf("https://hrms.example/api/fast"),
    );
    expect(text).toContain("4.20");
    expect(text).toContain("3.80");
    expect(text).toContain("3.60");
    expect(text).toContain("app.js:10");
    expect(text).toContain("Yes");
    expect(container!.querySelector("tr.autofill-slow-request")).toBeTruthy();
  });

  it("hides a script row until show-all is on (negative)", () => {
    const rows = [
      row({ requestId: "api", url: "https://hrms.example/api/save", resourceType: "Fetch" }),
      row({
        requestId: "script",
        url: "https://hrms.example/static/app.js",
        resourceType: "Script",
        durationSeconds: 9,
      }),
    ];
    mount({ rows, showAllTypes: false });
    expect(container!.textContent).toContain("https://hrms.example/api/save");
    expect(container!.textContent).not.toContain("https://hrms.example/static/app.js");

    mount({ rows, showAllTypes: true });
    expect(container!.textContent).toContain("https://hrms.example/static/app.js");
  });

  it("shows the empty hint and a pending ellipsis (edge)", () => {
    mount({ rows: [] });
    expect(container!.textContent).toContain(NETWORK_CAPTURE_EMPTY_HINT);

    mount({
      capturing: true,
      rows: [
        row({
          requestId: "pending",
          url: "https://hrms.example/api/pending",
          durationSeconds: null,
          waitingSeconds: null,
          handlingSeconds: null,
          status: null,
          initiatorLabel: "—",
        }),
      ],
    });
    expect(container!.textContent).toContain("https://hrms.example/api/pending");
    expect(container!.textContent).toContain("…");
    expect(container!.textContent).toContain("—");
  });

  it("spaces toolbar controls so labels do not overlap (positive)", () => {
    mount({ capturing: true, rows: [row({ requestId: "one" })] });
    const toolbar = container!.querySelector(
      "[data-network-timing-toolbar]",
    ) as HTMLElement;
    expect(toolbar.style.gap).toBe("12px");
    expect(toolbar.style.display).toBe("flex");
    expect(container!.textContent).toContain("Show all types");
    expect(container!.textContent).toContain("Capturing");
  });

  it("filters the table from the search box (negative)", () => {
    mount({
      capturing: true,
      rows: [
        row({
          requestId: "save",
          url: "https://hrms.example/api/education/save",
        }),
        row({
          requestId: "list",
          url: "https://hrms.example/api/bank/list",
        }),
      ],
    });
    const input = container!.querySelector(
      'input[aria-label="Filter requests"]',
    ) as HTMLInputElement;
    expect(input).toBeTruthy();

    act(() => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;
      nativeInputValueSetter?.call(input, "education/save");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(container!.textContent).toContain("https://hrms.example/api/education/save");
    expect(container!.textContent).not.toContain("https://hrms.example/api/bank/list");
  });

  it("shows a no-match message when the search finds nothing (edge)", () => {
    mount({
      capturing: true,
      rows: [row({ requestId: "one", url: "https://hrms.example/api/one" })],
    });
    const input = container!.querySelector(
      'input[aria-label="Filter requests"]',
    ) as HTMLInputElement;
    act(() => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;
      nativeInputValueSetter?.call(input, "does-not-exist");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(container!.textContent).toContain("No requests match this search.");
  });
});
