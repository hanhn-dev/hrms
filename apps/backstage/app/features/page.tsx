import { FeatureIndex } from "@/components/features/feature-index";
import { getCurrentFeatureDocs } from "@/lib/features";

export default function FeaturesPage(): React.JSX.Element {
  const docs = getCurrentFeatureDocs().map(({ slug, title, menu, submenu }) => ({
    slug,
    title,
    menu,
    submenu,
  }));

  return (
    <div className="h-full min-h-0 flex-1 overflow-y-auto px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          Feature guides
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Generated module/feature guides connecting SourceCode call chains to the
          underlying HRMS-DATABASE tables and stored procedures. Grouped to match
          the HRMS left-nav. Produced by the{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[13px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            /document-feature
          </code>{" "}
          command.
        </p>

        <FeatureIndex docs={docs} />
      </div>
    </div>
  );
}
