import type { FloatMenuActionId } from "@/features/float-menu/float-menu-logic";

/**
 * Keyboard shortcuts for Form Autofill actions.
 *
 * In-page (content script) bindings always use Alt+Shift+letter so they work
 * while a form input is focused. Chrome `commands` suggested keys match the
 * four main actions (Chrome allows at most four suggested keys); users can
 * rebind or add Toggle menu at chrome://extensions/shortcuts.
 */

export type ShortcutActionId = FloatMenuActionId | "toggle-menu";

export interface ShortcutBinding {
  id: ShortcutActionId;
  /** Letter matched via KeyboardEvent.code (`KeyP`) or key. */
  key: string;
  /** Shown in the FAB menu, popup tooltips, and Chrome's shortcut UI. */
  label: string;
  description: string;
  /** Chrome only allows four `suggested_key` entries per extension. */
  suggestInChrome: boolean;
}

export const SHORTCUT_BINDINGS: readonly ShortcutBinding[] = [
  {
    id: "pick-scan",
    key: "p",
    label: "Alt+Shift+P",
    description: "Pick & scan a form section",
    suggestInChrome: true,
  },
  {
    id: "scan-page",
    key: "s",
    label: "Alt+Shift+S",
    description: "Scan the current page",
    suggestInChrome: true,
  },
  {
    id: "pick-fill",
    key: "f",
    label: "Alt+Shift+F",
    description: "Pick a section and fill it (or fill selected in the popup)",
    suggestInChrome: true,
  },
  {
    id: "auto-type",
    key: "t",
    label: "Alt+Shift+T",
    description: "Pick a section and auto-type each field",
    suggestInChrome: true,
  },
  {
    id: "toggle-menu",
    key: "m",
    label: "Alt+Shift+M",
    description: "Toggle the Form Autofill floating menu",
    suggestInChrome: false,
  },
] as const;

const BINDING_BY_ID = new Map(
  SHORTCUT_BINDINGS.map((binding) => [binding.id, binding]),
);

export interface KeyModifierEvent {
  key: string;
  code?: string;
  altKey: boolean;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  repeat?: boolean;
  isComposing?: boolean;
}

export function shortcutLabelFor(id: ShortcutActionId): string {
  return BINDING_BY_ID.get(id)?.label ?? "";
}

export function actionFromChromeCommand(
  command: string,
): ShortcutActionId | null {
  return BINDING_BY_ID.has(command as ShortcutActionId)
    ? (command as ShortcutActionId)
    : null;
}

export function getChromeCommandsManifest(): Record<
  string,
  { description: string; suggested_key?: { default: string } }
> {
  const commands: Record<
    string,
    { description: string; suggested_key?: { default: string } }
  > = {};
  for (const binding of SHORTCUT_BINDINGS) {
    commands[binding.id] = { description: binding.description };
    if (binding.suggestInChrome) {
      commands[binding.id]!.suggested_key = { default: binding.label };
    }
  }
  return commands;
}

function eventLetter(event: KeyModifierEvent): string {
  const code = event.code ?? "";
  if (/^Key[A-Z]$/.test(code)) {
    return code.slice(3).toLowerCase();
  }
  return event.key.length === 1 ? event.key.toLowerCase() : "";
}

/** True when Alt+Shift is held without Ctrl/Meta (avoids browser/OS chords). */
export function isAltShiftChord(event: KeyModifierEvent): boolean {
  return (
    event.altKey === true &&
    event.shiftKey === true &&
    event.ctrlKey !== true &&
    event.metaKey !== true
  );
}

/** True for Escape, including the legacy `Esc` key name some browsers send. */
export function isEscapeKey(event: {
  key?: string;
  code?: string;
}): boolean {
  return event.key === "Escape" || event.key === "Esc" || event.code === "Escape";
}

export function matchShortcut(event: KeyModifierEvent): ShortcutActionId | null {
  if (event.repeat || event.isComposing || !isAltShiftChord(event)) {
    return null;
  }
  const letter = eventLetter(event);
  if (!letter) {
    return null;
  }
  const binding = SHORTCUT_BINDINGS.find((item) => item.key === letter);
  return binding?.id ?? null;
}

export type PopupShortcutAction =
  | "pick-scan"
  | "scan-page"
  | "pick-fill"
  | "fill-selected"
  | "pick-auto-type"
  | "auto-type";

/**
 * Map a page shortcut to the popup action. Fill selected shares Alt+Shift+F
 * with Pick & fill (same swapped button). Auto-type selected shares Alt+Shift+T
 * with Pick & type.
 */
export function resolvePopupShortcutAction(
  shortcutId: ShortcutActionId,
  hasSelection: boolean,
): PopupShortcutAction | null {
  switch (shortcutId) {
    case "toggle-menu":
      return null;
    case "pick-fill":
      return hasSelection ? "fill-selected" : "pick-fill";
    case "auto-type":
      return hasSelection ? "auto-type" : "pick-auto-type";
    default:
      return shortcutId;
  }
}

export interface BindPageShortcutsOptions {
  document?: Document;
  onAction: (id: FloatMenuActionId) => void;
  onToggleMenu?: () => void;
  /** Fires for Escape (all frames). Used to close the top-frame FAB menu. */
  onEscape?: (event: KeyboardEvent) => void;
}

/**
 * Capture-phase listener so Alt+Shift chords work while a form field is focused.
 * Returns an unsubscribe function.
 */
export function bindPageShortcuts(
  options: BindPageShortcutsOptions,
): () => void {
  const doc = options.document ?? document;
  const onKeyDown = (event: KeyboardEvent) => {
    if (isEscapeKey(event)) {
      options.onEscape?.(event);
      return;
    }
    const id = matchShortcut(event);
    if (!id) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (id === "toggle-menu") {
      options.onToggleMenu?.();
      return;
    }
    options.onAction(id);
  };
  doc.addEventListener("keydown", onKeyDown, true);
  return () => {
    doc.removeEventListener("keydown", onKeyDown, true);
  };
}
