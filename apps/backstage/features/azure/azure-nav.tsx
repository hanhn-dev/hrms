import Link from "next/link";

const LINK_CLASS = "text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white";
const ACTIVE_LINK_CLASS = "text-sm font-semibold text-slate-900 dark:text-white";

export function AzureNav({
  active,
}: {
  active?: "sprints" | "pull-requests";
}): React.JSX.Element {
  return (
    <nav className="flex items-center gap-4">
      <Link
        className={active === "sprints" ? ACTIVE_LINK_CLASS : LINK_CLASS}
        href="/azure/sprints"
      >
        Sprints
      </Link>
      <Link
        className={active === "pull-requests" ? ACTIVE_LINK_CLASS : LINK_CLASS}
        href="/azure/pull-requests"
      >
        Pull requests
      </Link>
      <Link className={LINK_CLASS} href="/employers">
        Console
      </Link>
    </nav>
  );
}
