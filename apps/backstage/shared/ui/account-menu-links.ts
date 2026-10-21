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

export const signOutMenuItem = {
  key: "signout",
  label: "Sign out",
} as const;
