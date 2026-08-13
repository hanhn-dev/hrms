import type { FeatureSection } from "../../lib/features";

export function TableOfContents({
  sections,
}: {
  sections: FeatureSection[];
}): React.JSX.Element {
  return (
    <nav className="flex w-64 shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        On this page
      </p>
      {sections.length === 0 ? (
        <p className="mt-3 text-sm italic text-slate-500">No sections.</p>
      ) : (
        <ul className="mt-3 space-y-1 text-sm">
          {sections.map((section) => (
            <li key={section.id}>
              <a
                className={
                  section.depth === 3
                    ? "block pl-3 text-slate-600 hover:text-slate-900"
                    : "block text-slate-600 hover:text-slate-900"
                }
                href={`#${section.id}`}
              >
                {section.title}
              </a>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
