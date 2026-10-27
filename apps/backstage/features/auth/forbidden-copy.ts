const AREAS = {
  employers: { label: "Console", role: "Backstage.Employers" },
  dbs: { label: "Db Studio", role: "Backstage.Dbs" },
  azure: { label: "Azure DevOps", role: "Backstage.Azure" },
  guides: { label: "Proposal review", role: "Backstage.Admin" },
} as const;

export function forbiddenMessage(
  area: string | undefined,
  user: { name?: string | null; email?: string | null },
): { title: string; body: string } {
  const known = area && area in AREAS ? AREAS[area as keyof typeof AREAS] : null;
  const name = user.name?.trim();
  const email = user.email?.trim();
  const who = name && email ? `${name} (${email})` : name || email || "this account";
  if (!known) {
    return {
      title: "You don't have access to that page.",
      body: `You're signed in as ${who}. Ask an administrator to assign the role this page needs on the Backstage Microsoft app.`,
    };
  }
  return {
    title: `You don't have access to ${known.label}.`,
    body: `You're signed in as ${who}. This area needs the ${known.role} role. Ask an administrator to assign that role on the Backstage Microsoft app.`,
  };
}
