export {
  SHORTCUT_BINDINGS,
  actionFromChromeCommand,
  bindPageShortcuts,
  getChromeCommandsManifest,
  isAltShiftChord,
  isEscapeKey,
  matchShortcut,
  resolvePopupShortcutAction,
  shortcutLabelFor,
} from "./shortcuts";
export type {
  BindPageShortcutsOptions,
  KeyModifierEvent,
  PopupShortcutAction,
  ShortcutActionId,
  ShortcutBinding,
} from "./shortcuts";
