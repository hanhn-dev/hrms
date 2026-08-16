function LinkIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 group-data-[copied]/permalink:hidden"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function CheckIcon(): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="hidden h-4 w-4 group-data-[copied]/permalink:inline"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function HeadingPermalink({
  id,
  label,
}: {
  id: string;
  label: string;
}): React.JSX.Element {
  return (
    <a
      href={`#${id}`}
      data-heading-copy={id}
      data-heading-label={label}
      className={
        "group/permalink not-prose ml-2 inline-flex items-center gap-1 align-middle text-sm font-normal no-underline " +
        "transition-[opacity,translate] duration-200 ease-out motion-reduce:transition-none motion-reduce:translate-none " +
        "pointer-events-none -translate-x-1 opacity-0 " +
        "group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100 " +
        "focus-visible:pointer-events-auto focus-visible:translate-x-0 focus-visible:opacity-100 " +
        "text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 " +
        "data-[copied]:pointer-events-auto data-[copied]:translate-x-0 data-[copied]:opacity-100 " +
        "data-[copied]:text-emerald-600 dark:data-[copied]:text-emerald-400"
      }
      aria-label={`Copy link to ${label}`}
      title="Copy link"
    >
      <LinkIcon />
      <CheckIcon />
      <span className="hidden text-xs font-medium group-data-[copied]/permalink:inline">
        Copied
      </span>
      <span className="sr-only" aria-live="polite">
        <span className="hidden group-data-[copied]/permalink:inline">Copied</span>
      </span>
    </a>
  );
}
