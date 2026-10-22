/** True when pathname is the ops href or a nested path under it. */
export function pathMatchesOpsHref(pathname: string, href: string): boolean {
  if (pathname === href) {
    return true;
  }
  return pathname.startsWith(`${href}/`);
}
