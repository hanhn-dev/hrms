export { fillFields } from "./fill-fields";
export type { FillResult, FillOptions } from "./fill-fields";
export { hasExistingValue, looksLikePromptText } from "./has-existing-value";
export {
  setNativeValue,
  clearNativeValue,
  dispatchBlur,
  fillAutocomplete,
  fillRadio,
  dismissOpenOverlays,
} from "./react-fill";
export type { FillAutocompleteOptions, FillTacticResult } from "./react-fill";
export {
  fillDatePicker,
  parseDisplayDate,
  findOpenPickerButton,
  findPickerSurface,
  pointerClick,
} from "./fill-date-picker";
export {
  fillControlledDateInPageWorld,
  fillControlledDateMainWorld,
  fillComboInPageWorld,
  fillComboWidgetMainWorld,
} from "./page-world";
export {
  startFillSession,
  endFillSession,
  isFillSessionActive,
} from "./fill-session";
