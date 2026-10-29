import Link from "next/link";

const LINK_CLASS = "text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white";
const ACTIVE_LINK_CLASS = "text-sm font-semibold text-slate-900 dark:text-white";

export function AzureNav({
  active,
}: {
  active?: "board" | "sprints" | "roadmap" | "pull-requests" | "git" | "work-item-drafts";
}): React.JSX.Element {
  return (
    <nav className="flex flex-wrap items-center gap-4">
      <Link
        className={active === "board" ? ACTIVE_LINK_CLASS : LINK_CLASS}
        href="/azure/board"
      >
        Board
      </Link>
      <Link
        className={active === "sprints" ? ACTIVE_LINK_CLASS : LINK_CLASS}
        href="/azure/sprints"
      >
        Sprints
      </Link>
      <Link
        className={active === "roadmap" ? ACTIVE_LINK_CLASS : LINK_CLASS}
        href="/azure/roadmap"
      >
        Roadmap
      </Link>
      <Link
        className={active === "pull-requests" ? ACTIVE_LINK_CLASS : LINK_CLASS}
        href="/azure/pull-requests"
      >
        Pull requests
      </Link>
      <Link
        className={active === "git" ? ACTIVE_LINK_CLASS : LINK_CLASS}
        href="/azure/git"
      >
        Git
      </Link>
      <Link
        className={active === "work-item-drafts" ? ACTIVE_LINK_CLASS : LINK_CLASS}
        href="/azure/work-item-drafts"
      >
        Work item drafts
      </Link>
      <Link className={LINK_CLASS} href="/employers">
        Console
      </Link>
    </nav>
  );
}
