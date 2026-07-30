import type React from "react";

export function ProjectEmptyState(): React.JSX.Element {
  return (
    <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 p-10 text-slate-200">
      <h2 className="text-2xl font-semibold text-white">No design project selected</h2>
      <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
        Start from an HTML snapshot or screenshot import to create your first editable draft.
      </p>
    </div>
  );
}