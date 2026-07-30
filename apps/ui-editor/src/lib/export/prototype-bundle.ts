import type { PrototypeBundle } from "../../schemas/prototype-bundle";

export function exportPrototypeBundle(bundle: PrototypeBundle): string {
  const json = JSON.stringify(bundle, null, 2);
  const fileName = `${bundle.project.name.replace(/\s+/g, "-").toLowerCase()}-prototype.json`;
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);

  return fileName;
}