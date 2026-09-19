import { describe, expect, it, vi, afterEach } from "vitest";
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
    onAutoTypeSelected: vi.fn(),
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
  });
});
