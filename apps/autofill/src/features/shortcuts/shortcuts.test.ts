import { FLOAT_MENU_ITEMS } from "@/features/float-menu/float-menu-logic";
import {
  SHORTCUT_BINDINGS,
  actionFromChromeCommand,
  bindPageShortcuts,
  getChromeCommandsManifest,
  isAltShiftChord,
  isEscapeKey,
  matchShortcut,
  resolvePopupShortcutAction,
  shortcutLabelFor,
  type KeyModifierEvent,
} from "./shortcuts";

function chord(
  key: string,
  extras: Partial<KeyModifierEvent> = {},
): KeyModifierEvent {
  return {
    key,
    code: extras.code ?? (key.length === 1 ? `Key${key.toUpperCase()}` : ""),
    altKey: true,
    shiftKey: true,
    ctrlKey: false,
    metaKey: false,
    ...extras,
  };
}

describe("matchShortcut", () => {
  it("maps Alt+Shift letter chords to actions (positive)", () => {
    expect(matchShortcut(chord("p"))).toBe("pick-scan");
    expect(matchShortcut(chord("S", { code: "KeyS" }))).toBe("scan-page");
    expect(matchShortcut(chord("f"))).toBe("pick-fill");
    expect(matchShortcut(chord("t"))).toBe("auto-type");
    expect(matchShortcut(chord("m"))).toBe("toggle-menu");
  });

  it("ignores chords without Alt+Shift or with Ctrl/Meta (negative)", () => {
    expect(
      matchShortcut({
        key: "p",
        code: "KeyP",
        altKey: false,
        shiftKey: true,
        ctrlKey: false,
        metaKey: false,
      }),
    ).toBeNull();
    expect(matchShortcut(chord("p", { ctrlKey: true }))).toBeNull();
    expect(matchShortcut(chord("p", { metaKey: true }))).toBeNull();
    expect(isAltShiftChord(chord("p", { ctrlKey: true }))).toBe(false);
  });

  it("ignores repeats, IME composition, and unknown keys (edge)", () => {
    expect(matchShortcut(chord("p", { repeat: true }))).toBeNull();
    expect(matchShortcut(chord("p", { isComposing: true }))).toBeNull();
    expect(matchShortcut(chord("x"))).toBeNull();
    expect(matchShortcut(chord("Shift", { code: "ShiftLeft", key: "Shift" }))).toBe(
      null,
    );
    expect(
      matchShortcut(
        chord("p", {
          code: "",
          key: "P",
        }),
      ),
    ).toBe("pick-scan");
  });
});

describe("chrome commands manifest", () => {
  it("suggests at most four keys and names every binding (positive)", () => {
    const commands = getChromeCommandsManifest();
    expect(Object.keys(commands)).toEqual(
      SHORTCUT_BINDINGS.map((binding) => binding.id),
    );
    const suggested = Object.values(commands).filter(
      (command) => command.suggested_key,
    );
    expect(suggested).toHaveLength(4);
    expect(commands["pick-scan"]?.suggested_key?.default).toBe("Alt+Shift+P");
    for (const item of FLOAT_MENU_ITEMS) {
      expect(shortcutLabelFor(item.id)).toMatch(/^Alt\+Shift\+[A-Z]$/);
    }
  });

  it("rejects unknown command names (negative)", () => {
    expect(actionFromChromeCommand("not-a-command")).toBeNull();
    expect(actionFromChromeCommand("")).toBeNull();
  });

  it("resolves toggle-menu without a suggested key (edge)", () => {
    expect(actionFromChromeCommand("toggle-menu")).toBe("toggle-menu");
    expect(getChromeCommandsManifest()["toggle-menu"]?.suggested_key).toBeUndefined();
    expect(shortcutLabelFor("toggle-menu")).toBe("Alt+Shift+M");
  });
});

describe("resolvePopupShortcutAction", () => {
  it("uses pick-fill when nothing is selected (positive)", () => {
    expect(resolvePopupShortcutAction("pick-fill", false)).toBe("pick-fill");
    expect(resolvePopupShortcutAction("pick-scan", false)).toBe("pick-scan");
  });

  it("swaps to fill-selected and pick-auto-type without a selection (negative)", () => {
    expect(resolvePopupShortcutAction("pick-fill", true)).toBe("fill-selected");
    expect(resolvePopupShortcutAction("auto-type", false)).toBe(
      "pick-auto-type",
    );
    expect(resolvePopupShortcutAction("toggle-menu", true)).toBeNull();
  });

  it("keeps auto-type when a field is checked (edge)", () => {
    expect(resolvePopupShortcutAction("auto-type", true)).toBe("auto-type");
    expect(resolvePopupShortcutAction("scan-page", true)).toBe("scan-page");
  });
});

describe("bindPageShortcuts", () => {
  it("invokes the matching action and prevents the default (positive)", () => {
    const onAction = vi.fn();
    const onToggleMenu = vi.fn();
    const unbind = bindPageShortcuts({ document, onAction, onToggleMenu });
    const event = new KeyboardEvent("keydown", {
      key: "s",
      code: "KeyS",
      altKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(onAction).toHaveBeenCalledWith("scan-page");
    expect(onToggleMenu).not.toHaveBeenCalled();
    unbind();
  });

  it("does not fire onAction for unrelated keys (negative)", () => {
    const onAction = vi.fn();
    const unbind = bindPageShortcuts({ document, onAction });
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "s",
        code: "KeyS",
        altKey: false,
        shiftKey: false,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(onAction).not.toHaveBeenCalled();
    unbind();
  });

  it("toggles the menu and unsubscribes (edge)", () => {
    const onAction = vi.fn();
    const onToggleMenu = vi.fn();
    const unbind = bindPageShortcuts({ document, onAction, onToggleMenu });
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "m",
        code: "KeyM",
        altKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(onToggleMenu).toHaveBeenCalledTimes(1);
    expect(onAction).not.toHaveBeenCalled();
    unbind();
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "m",
        code: "KeyM",
        altKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(onToggleMenu).toHaveBeenCalledTimes(1);
  });
});

describe("isEscapeKey", () => {
  it("accepts Escape (positive)", () => {
    expect(isEscapeKey({ key: "Escape", code: "Escape" })).toBe(true);
  });

  it("rejects other keys (negative)", () => {
    expect(isEscapeKey({ key: "Enter", code: "Enter" })).toBe(false);
    expect(isEscapeKey({ key: "m", code: "KeyM" })).toBe(false);
  });

  it("accepts legacy Esc and code-only events (edge)", () => {
    expect(isEscapeKey({ key: "Esc" })).toBe(true);
    expect(isEscapeKey({ key: "", code: "Escape" })).toBe(true);
    expect(isEscapeKey({})).toBe(false);
  });
});

describe("bindPageShortcuts Escape", () => {
  it("invokes onEscape for Escape (positive)", () => {
    const onAction = vi.fn();
    const onEscape = vi.fn();
    const unbind = bindPageShortcuts({ document, onAction, onEscape });
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        code: "Escape",
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(onEscape).toHaveBeenCalledTimes(1);
    expect(onAction).not.toHaveBeenCalled();
    unbind();
  });

  it("does not invoke onEscape for unrelated keys (negative)", () => {
    const onEscape = vi.fn();
    const unbind = bindPageShortcuts({
      document,
      onAction: vi.fn(),
      onEscape,
    });
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "m",
        code: "KeyM",
        altKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(onEscape).not.toHaveBeenCalled();
    unbind();
  });

  it("unsubscribes Escape handling (edge)", () => {
    const onEscape = vi.fn();
    const unbind = bindPageShortcuts({
      document,
      onAction: vi.fn(),
      onEscape,
    });
    unbind();
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Esc",
        code: "Escape",
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(onEscape).not.toHaveBeenCalled();
  });
});
