import { MESSAGE, type AutofillResponse } from "@/shared/messaging";
import {
  FLOAT_MENU_ITEMS,
  FAB_SIZE,
  buildRequestForAction,
  clampFabPosition,
  defaultFabPosition,
  isDragGesture,
  isFloatMenuActionId,
  mountFloatMenu,
  normalizeFabPosition,
  resolveFabPosition,
  shouldMountFloatMenu,
  unmountFloatMenu,
} from "./float-menu";

function waitForHandle(get: () => boolean, attempts = 40): Promise<void> {
  return new Promise((resolve, reject) => {
    let n = 0;
    const tick = () => {
      if (get()) {
        resolve();
        return;
      }
      n += 1;
      if (n >= attempts) {
        reject(new Error("handle not ready"));
        return;
      }
      setTimeout(tick, 10);
    };
    tick();
  });
}

describe("float menu items", () => {
  it("lists the four ActionBar actions with icons (positive)", () => {
    expect(FLOAT_MENU_ITEMS.map((i) => i.id)).toEqual([
      "pick-scan",
      "scan-page",
      "pick-fill",
      "auto-type",
    ]);
    expect(FLOAT_MENU_ITEMS.map((i) => i.icon)).toEqual([
      "aim",
      "reload",
      "form",
      "fontSize",
    ]);
    expect(FLOAT_MENU_ITEMS.find((i) => i.id === "auto-type")?.label).toBe(
      "Pick & type",
    );
    expect(buildRequestForAction("pick-scan").type).toBe(
      MESSAGE.START_PICK_SCAN,
    );
    expect(buildRequestForAction("scan-page").type).toBe(MESSAGE.SCAN);
    expect(buildRequestForAction("pick-fill").type).toBe(
      MESSAGE.START_PICK_FILL,
    );
    expect(
      buildRequestForAction("auto-type", {
        typingDelayMs: 40,
        startWithInvalid: true,
      }),
    ).toEqual({
      type: MESSAGE.START_PICK_AUTO_TYPE,
      typingDelayMs: 40,
      startWithInvalid: true,
    });
  });

  it("rejects unknown action ids (negative)", () => {
    expect(isFloatMenuActionId("other")).toBe(false);
    expect(isFloatMenuActionId("")).toBe(false);
  });

  it("handles nullish action ids (edge)", () => {
    expect(isFloatMenuActionId(undefined)).toBe(false);
    expect(isFloatMenuActionId(null)).toBe(false);
  });
});

describe("shouldMountFloatMenu", () => {
  it("returns true when window is top (positive)", () => {
    const self = {} as Window;
    expect(shouldMountFloatMenu({ top: self, self })).toBe(true);
  });

  it("returns false when nested in an iframe (negative)", () => {
    const self = {} as Window;
    const top = {} as Window;
    expect(shouldMountFloatMenu({ top, self })).toBe(false);
  });

  it("returns false when top access throws (edge)", () => {
    const self = {} as Window;
    const win = {
      self,
      get top(): Window {
        throw new Error("cross-origin");
      },
    };
    expect(shouldMountFloatMenu(win)).toBe(false);
  });
});

describe("fab position helpers", () => {
  it("defaults to bottom-right inset (positive)", () => {
    expect(defaultFabPosition(1000, 800)).toEqual({
      left: 1000 - 16 - FAB_SIZE,
      top: 800 - 72 - FAB_SIZE,
    });
  });

  it("clamps out-of-bounds positions (negative)", () => {
    expect(clampFabPosition({ left: -40, top: 900 }, 400, 300)).toEqual({
      left: 0,
      top: 300 - FAB_SIZE,
    });
  });

  it("normalizes and resolves stored positions (edge)", () => {
    expect(normalizeFabPosition({ left: 10, top: 20 })).toEqual({
      left: 10,
      top: 20,
    });
    expect(normalizeFabPosition(null)).toBeNull();
    expect(normalizeFabPosition({ left: "x" })).toBeNull();
    expect(resolveFabPosition({ left: 12, top: 34 }, 800, 600)).toEqual({
      left: 12,
      top: 34,
    });
    expect(resolveFabPosition(null, 1000, 800)).toEqual(
      defaultFabPosition(1000, 800),
    );
  });

  it("detects drag vs click threshold (positive/negative)", () => {
    expect(isDragGesture(6, 0)).toBe(true);
    expect(isDragGesture(1, 1)).toBe(false);
  });
});

function stubSendMessage() {
  return vi.fn(async (payload: unknown) => {
    if (
      typeof payload === "object" &&
      payload !== null &&
      "type" in payload &&
      payload.type === MESSAGE.GET_FAB_POSITION
    ) {
      return { ok: true as const, position: null };
    }
    return { ok: true as const, started: true };
  });
}

function pointerEvent(
  type: string,
  clientX: number,
  clientY: number,
): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: 1,
    button: 0,
    buttons: type === "pointerup" || type === "pointercancel" ? 0 : 1,
    clientX,
    clientY,
  });
}

describe("mountFloatMenu", () => {
  beforeEach(() => {
    unmountFloatMenu(document);
    document.body.innerHTML = "";
    HTMLElement.prototype.setPointerCapture ??= () => undefined;
    HTMLElement.prototype.releasePointerCapture ??= () => undefined;
  });

  afterEach(() => {
    unmountFloatMenu(document);
  });

  it("mounts FAB with ant icon and runs a selected action (positive)", async () => {
    const sendMessage = vi.fn(async (payload: unknown) => {
      if (
        typeof payload === "object" &&
        payload !== null &&
        "type" in payload &&
        payload.type === MESSAGE.GET_SETTINGS
      ) {
        return {
          ok: true as const,
          settings: { typingDelayMs: 60, startWithInvalid: false },
        };
      }
      if (
        typeof payload === "object" &&
        payload !== null &&
        "type" in payload &&
        payload.type === MESSAGE.GET_FAB_POSITION
      ) {
        return { ok: true as const, position: null };
      }
      return {
        ok: true as const,
        fields: [],
        url: "https://example.test",
      };
    });

    const controller = mountFloatMenu({ sendMessage, document });
    expect(controller).not.toBeNull();
    await controller!.whenReady();

    expect(document.getElementById("form-autofill-float-fab")).toBeTruthy();
    expect(
      document.querySelector("#form-autofill-float-fab .anticon"),
    ).toBeTruthy();

    controller!.setOpen(true);
    await waitForHandle(() => controller!.open);
    expect(controller!.open).toBe(true);

    await controller!.runAction("scan-page");
    await waitForHandle(() => !controller!.open && !controller!.busy);
    expect(sendMessage).toHaveBeenCalledWith({ type: MESSAGE.SCAN });
    expect(controller!.busy).toBe(false);
    expect(controller!.open).toBe(false);
  });

  it("ignores a second run while busy (negative)", async () => {
    let resolveScan!: (value: AutofillResponse) => void;
    let releaseFillStarted!: () => void;
    const fillStarted = new Promise<void>((resolve) => {
      releaseFillStarted = resolve;
    });

    const sendMessage = vi.fn((payload: unknown) => {
      if (
        typeof payload === "object" &&
        payload !== null &&
        "type" in payload &&
        payload.type === MESSAGE.GET_SETTINGS
      ) {
        return Promise.resolve({
          ok: true as const,
          settings: { typingDelayMs: 60, startWithInvalid: false },
        });
      }
      if (
        typeof payload === "object" &&
        payload !== null &&
        "type" in payload &&
        payload.type === MESSAGE.GET_FAB_POSITION
      ) {
        return Promise.resolve({ ok: true as const, position: null });
      }
      releaseFillStarted();
      return new Promise<AutofillResponse>((resolve) => {
        resolveScan = resolve;
      });
    });

    const controller = mountFloatMenu({ sendMessage, document });
    expect(controller).not.toBeNull();
    await controller!.whenReady();

    const first = controller!.runAction("pick-fill");
    await fillStarted;
    expect(controller!.busy).toBe(true);

    await controller!.runAction("pick-fill");
    resolveScan({ ok: true, started: true });
    await first;
    await waitForHandle(() => !controller!.busy);

    const fillCalls = sendMessage.mock.calls.filter(
      (call) =>
        typeof call[0] === "object" &&
        call[0] !== null &&
        "type" in call[0] &&
        call[0].type === MESSAGE.START_PICK_FILL,
    );
    expect(fillCalls).toHaveLength(1);
  });

  it("restores a saved FAB position from extension storage (positive)", async () => {
    const sendMessage = vi.fn(async (payload: unknown) => {
      if (
        typeof payload === "object" &&
        payload !== null &&
        "type" in payload &&
        payload.type === MESSAGE.GET_FAB_POSITION
      ) {
        return { ok: true as const, position: { left: 40, top: 80 } };
      }
      return { ok: true as const, started: true };
    });

    const controller = mountFloatMenu({ sendMessage, document });
    await controller!.whenReady();
    await waitForHandle(() =>
      sendMessage.mock.calls.some(
        (call) =>
          typeof call[0] === "object" &&
          call[0] !== null &&
          "type" in call[0] &&
          call[0].type === MESSAGE.GET_FAB_POSITION,
      ),
    );
    await waitForHandle(() => {
      const root = document.getElementById("form-autofill-float-root");
      const shell = root?.firstElementChild as HTMLElement | null;
      return shell?.style.left === "40px" && shell?.style.top === "80px";
    });
  });

  it("does not remount when root already exists (edge)", async () => {
    const sendMessage = vi.fn(async () => ({
      ok: true as const,
      position: null,
    }));
    const first = mountFloatMenu({ sendMessage, document });
    await first!.whenReady();
    const second = mountFloatMenu({ sendMessage, document });
    expect(first).not.toBeNull();
    expect(second).toBeNull();
    expect(document.querySelectorAll("#form-autofill-float-root")).toHaveLength(
      1,
    );
  });

  it("returns null when canMount is false (negative)", () => {
    const controller = mountFloatMenu({
      canMount: false,
      document,
      sendMessage: vi.fn(async () => ({ ok: true as const, started: true })),
    });
    expect(controller).toBeNull();
    expect(document.getElementById("form-autofill-float-root")).toBeNull();
  });

  it("opens the menu on click without pointer events (positive)", async () => {
    const controller = mountFloatMenu({
      sendMessage: stubSendMessage(),
      document,
    });
    await controller!.whenReady();

    const fab = document.getElementById(
      "form-autofill-float-fab",
    ) as HTMLButtonElement;
    fab.click();
    await waitForHandle(() => controller!.open);

    expect(controller!.open).toBe(true);
    expect(
      document.getElementById("form-autofill-float-menu")?.hidden,
    ).toBe(false);
    expect(
      document.getElementById("form-autofill-float-menu")?.textContent,
    ).toContain("Alt+Shift+P");
    expect(
      document.getElementById("form-autofill-float-fab")?.getAttribute(
        "aria-keyshortcuts",
      ),
    ).toBe("Alt+Shift+M");
  });

  it("does not open the menu after a drag gesture (negative)", async () => {
    const controller = mountFloatMenu({
      sendMessage: stubSendMessage(),
      document,
    });
    await controller!.whenReady();

    const fab = document.getElementById(
      "form-autofill-float-fab",
    ) as HTMLButtonElement;
    fab.dispatchEvent(pointerEvent("pointerdown", 100, 100));
    fab.dispatchEvent(pointerEvent("pointermove", 140, 100));
    fab.dispatchEvent(pointerEvent("pointerup", 140, 100));
    fab.click();
    await new Promise((resolve) => {
      setTimeout(resolve, 30);
    });

    expect(controller!.open).toBe(false);
  });

  it("opens from an inner-icon click and only once after pointerup (edge)", async () => {
    const controller = mountFloatMenu({
      sendMessage: stubSendMessage(),
      document,
    });
    await controller!.whenReady();

    const fab = document.getElementById(
      "form-autofill-float-fab",
    ) as HTMLButtonElement;
    const icon = fab.querySelector(".anticon");
    expect(icon).toBeTruthy();

    icon!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await waitForHandle(() => controller!.open);
    expect(controller!.open).toBe(true);

    fab.dispatchEvent(pointerEvent("pointerdown", 20, 20));
    fab.dispatchEvent(pointerEvent("pointerup", 20, 20));
    fab.click();
    await waitForHandle(() => !controller!.open);
    expect(controller!.open).toBe(false);
  });
});

function escapeEvent(key = "Escape"): KeyboardEvent {
  return new KeyboardEvent("keydown", {
    key,
    code: "Escape",
    bubbles: true,
    cancelable: true,
  });
}

describe("float menu Escape", () => {
  beforeEach(() => {
    unmountFloatMenu(document);
    document.body.innerHTML = "";
    HTMLElement.prototype.setPointerCapture ??= () => undefined;
    HTMLElement.prototype.releasePointerCapture ??= () => undefined;
  });

  afterEach(() => {
    unmountFloatMenu(document);
  });

  async function openMenu() {
    const controller = mountFloatMenu({
      sendMessage: stubSendMessage(),
      document,
    });
    await controller!.whenReady();
    controller!.setOpen(true);
    await waitForHandle(() => controller!.open);
    // Window capture listener is registered in useEffect after paint.
    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });
    return controller!;
  }

  it("closes an open menu on Escape (positive)", async () => {
    const controller = await openMenu();
    expect(
      document.getElementById("form-autofill-float-menu")?.hidden,
    ).toBe(false);

    window.dispatchEvent(escapeEvent());
    await waitForHandle(() => !controller.open);

    expect(controller.open).toBe(false);
    expect(
      document.getElementById("form-autofill-float-menu")?.hidden,
    ).toBe(true);
  });

  it("does not open a closed menu on Escape (negative)", async () => {
    const controller = mountFloatMenu({
      sendMessage: stubSendMessage(),
      document,
    });
    await controller!.whenReady();
    expect(controller!.open).toBe(false);

    window.dispatchEvent(escapeEvent());
    await new Promise((resolve) => {
      setTimeout(resolve, 30);
    });

    expect(controller!.open).toBe(false);
  });

  it("closes on legacy Esc from the FAB and ignores other keys (edge)", async () => {
    const controller = await openMenu();
    const fab = document.getElementById(
      "form-autofill-float-fab",
    ) as HTMLButtonElement;

    fab.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        bubbles: true,
        cancelable: true,
      }),
    );
    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });
    expect(controller.open).toBe(true);

    fab.dispatchEvent(escapeEvent("Esc"));
    await waitForHandle(() => !controller.open);
    expect(controller.open).toBe(false);
  });
});
