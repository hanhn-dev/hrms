export function hideDocsChrome(pathname: string): boolean {
  return (
    pathname === "/employers" ||
    pathname.startsWith("/employers/") ||
    pathname === "/dbs" ||
    pathname.startsWith("/dbs/") ||
    pathname === "/azure" ||
    pathname.startsWith("/azure/") ||
  pathname === "/login" ||
  pathname.startsWith("/login/") ||
  pathname === "/forbidden" ||
  pathname.startsWith("/forbidden/")
);
}
