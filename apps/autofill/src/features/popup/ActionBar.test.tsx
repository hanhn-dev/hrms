import { createRoot, type Root } from "react-dom/client";
import { act, type ComponentProps } from "react";
import { ActionBar } from "./ActionBar";

function mount(
  props: Partial<ComponentProps<typeof ActionBar>> = {},
): { container: HTMLDivElement; root: Root } {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const defaults: ComponentProps<typeof ActionBar> = {
    scanning: false,
    picking: false,
    filling: false,
    typing: false,
    hasSelection: false,
    onScanPage: vi.fn(),
    onPickScan: vi.fn(),
    onPickFill: vi.fn(),
    onFillSelected: vi.fn(),
    onPickAutoType: vi.fn(),
    onAutoTypeSelected: vi.fn(),
    onCancelAutoType: vi.fn(),
    ...props,
  };
  act(() => {
    root.render(<ActionBar {...defaults} />);
  });
  return { container, root };
}

describe("ActionBar", () => {
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

  it("shows Pick & fill when nothing is selected (positive)", () => {
    const onPickFill = vi.fn();
    ({ container, root } = mount({ onPickFill, hasSelection: false }));
    const button = Array.from(container.querySelectorAll("button")).find((el) =>
      el.textContent?.includes("Pick & fill"),
    );
    expect(button).toBeTruthy();
    expect(button?.getAttribute("aria-keyshortcuts")).toBe("Alt+Shift+F");
    const pickScan = Array.from(container.querySelectorAll("button")).find(
      (el) => el.textContent?.includes("Pick & scan"),
    );
    expect(pickScan?.getAttribute("aria-keyshortcuts")).toBe("Alt+Shift+P");
    act(() => {
      button!.click();
    });
    expect(onPickFill).toHaveBeenCalledTimes(1);
    expect(
      Array.from(container.querySelectorAll("button")).some((el) =>
        el.textContent?.includes("Fill selected"),
      ),
    ).toBe(false);
  });

  it("shows Fill selected when fields are checked (negative path for pick)", () => {
    const onFillSelected = vi.fn();
    const onPickFill = vi.fn();
    ({ container, root } = mount({
      onFillSelected,
      onPickFill,
      hasSelection: true,
    }));
    const button = Array.from(container.querySelectorAll("button")).find((el) =>
      el.textContent?.includes("Fill selected"),
    );
    expect(button).toBeTruthy();
    expect(button?.getAttribute("aria-keyshortcuts")).toBe("Alt+Shift+F");
    act(() => {
      button!.click();
    });
    expect(onFillSelected).toHaveBeenCalledTimes(1);
    expect(onPickFill).not.toHaveBeenCalled();
    expect(
      Array.from(container.querySelectorAll("button")).some((el) =>
        el.textContent?.includes("Pick & fill"),
      ),
    ).toBe(false);
  });

  it("shows Pick & type when nothing is selected (positive)", () => {
    const onPickAutoType = vi.fn();
    ({ container, root } = mount({ onPickAutoType, hasSelection: false }));
    const button = Array.from(container.querySelectorAll("button")).find((el) =>
      el.textContent?.includes("Pick & type"),
    );
    expect(button).toBeTruthy();
    expect(button?.getAttribute("aria-keyshortcuts")).toBe("Alt+Shift+T");
    act(() => {
      button!.click();
    });
    expect(onPickAutoType).toHaveBeenCalledTimes(1);
    expect(
      Array.from(container.querySelectorAll("button")).some((el) =>
        el.textContent?.includes("Auto-type selected"),
      ),
    ).toBe(false);
  });

  it("shows Auto-type selected when fields are checked (negative path for pick)", () => {
    const onAutoTypeSelected = vi.fn();
    const onPickAutoType = vi.fn();
    ({ container, root } = mount({
      onAutoTypeSelected,
      onPickAutoType,
      hasSelection: true,
    }));
    const button = Array.from(container.querySelectorAll("button")).find((el) =>
      el.textContent?.includes("Auto-type selected"),
    );
    expect(button).toBeTruthy();
    expect(button?.getAttribute("aria-keyshortcuts")).toBe("Alt+Shift+T");
    act(() => {
      button!.click();
    });
    expect(onAutoTypeSelected).toHaveBeenCalledTimes(1);
    expect(onPickAutoType).not.toHaveBeenCalled();
    expect(
      Array.from(container.querySelectorAll("button")).some((el) =>
        el.textContent?.includes("Pick & type"),
      ),
    ).toBe(false);
  });

  it("shows Stop typing while auto-type is running (positive)", () => {
    const onCancelAutoType = vi.fn();
    const onAutoTypeSelected = vi.fn();
    ({ container, root } = mount({
      typing: true,
      hasSelection: true,
      onCancelAutoType,
      onAutoTypeSelected,
    }));
    const button = Array.from(container.querySelectorAll("button")).find((el) =>
      el.textContent?.includes("Stop typing"),
    );
    expect(button).toBeTruthy();
    expect(
      Array.from(container.querySelectorAll("button")).some((el) =>
        el.textContent?.includes("Auto-type selected"),
      ),
    ).toBe(false);
    act(() => {
      button!.click();
    });
    expect(onCancelAutoType).toHaveBeenCalledTimes(1);
    expect(onAutoTypeSelected).not.toHaveBeenCalled();
  });

  it("disables Scan page while picking (edge)", () => {
    ({ container, root } = mount({ picking: true }));
    const scanPage = Array.from(container.querySelectorAll("button")).find(
      (el) => el.textContent?.includes("Scan page"),
    );
    const pickFill = Array.from(container.querySelectorAll("button")).find(
      (el) => el.textContent?.includes("Pick & fill"),
    );
    expect(scanPage?.disabled).toBe(true);
    expect(pickFill?.disabled).toBe(false);
    const pickType = Array.from(container.querySelectorAll("button")).find(
      (el) => el.textContent?.includes("Pick & type"),
    );
    expect(pickType?.getAttribute("aria-keyshortcuts")).toBe("Alt+Shift+T");
    expect(pickType?.disabled).toBe(false);
  });
});
