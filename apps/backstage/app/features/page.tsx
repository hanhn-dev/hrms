import { getAllFeatureDocs } from "../../lib/features";

export default function FeaturesPage(): React.JSX.Element {
  const hasDocs = getAllFeatureDocs().length > 0;

  return (
    <div className="flex h-full min-h-0 flex-1 items-center justify-center overflow-y-auto px-6 py-8">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Features</h1>
        <p className="mt-2 text-sm text-slate-600">
          Generated module/feature guides connecting SourceCode call chains to the
          underlying HRMS-DATABASE tables and stored procedures. Produced by the{" "}
          <code>/document-feature</code> command — see the wiki for authoritative DB
          lifecycle docs.
        </p>
        <p className="mt-4 text-sm italic text-slate-500">
          {hasDocs
            ? "Pick a feature from the list on the left to view its guide."
            : "No feature guides generated yet."}
        </p>
      </div>
    </div>
  );
}
