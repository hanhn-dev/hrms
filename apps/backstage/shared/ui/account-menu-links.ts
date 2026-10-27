import { canAccess, type Feature } from "@/shared/auth/access";

export type AccountMenuLink = {
  key: string;
  label: string;
  href: string;
};

export const accountMenuLinks: readonly AccountMenuLink[] = [
  { key: "home", label: "All employers", href: "/employers" },
  { key: "docs", label: "Docs", href: "/docs" },
  { key: "wiki", label: "Wiki", href: "/wiki" },
  { key: "dbs", label: "Data Builder Studio", href: "/dbs" },
  { key: "azure", label: "Azure DevOps", href: "/azure" },
  { key: "flows", label: "Flows", href: "/flows" },
  { key: "settings", label: "Settings", href: "/settings" },
];

const hrefFeature: Record<string, Feature> = {
  "/employers": "employers",
  "/dbs": "dbs",
  "/azure": "azure",
};

export function accountLinksForRoles(
  roles: readonly string[],
): readonly AccountMenuLink[] {
  return accountMenuLinks.filter((link) => {
    const feature = hrefFeature[link.href];
    return feature === undefined || canAccess(roles, feature);
  });
}

export const signOutMenuItem = {
  key: "signout",
  label: "Sign out",
} as const;
