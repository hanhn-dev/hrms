export {
  scanFields,
  findElementForField,
  resolveScanRoot,
  scannedFieldFromElement,
} from "./scan-fields";
export type { FillableElement } from "./scan-fields";
export {
  detectFieldKind,
  normalizeLabelText,
  buildSelectorHint,
} from "./field-types";
export {
  resolvePickRoot,
  resolvePickControl,
  pickHighlightHost,
  scanFromElement,
  getMarkedScanRoot,
  markScanRoot,
  countFillableControls,
} from "./resolve-pick-root";
