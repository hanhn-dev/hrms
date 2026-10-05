export function readablePageName(pageName: string | null | undefined): string {
  let name = pageName?.trim() ?? "";
  if (name.toLowerCase().startsWith("asp.")) {
    name = name.slice(4);
  }
  name = name.replace(/_aspx$/i, "");
  return name.replace(/_/g, " ").trim();
}
