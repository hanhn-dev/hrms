import type React from "react";

export function PreviewErrorState({ message }: { message: string }): React.JSX.Element {
  return (
    <div className="rounded-3xl border border-rose-500/40 bg-rose-950/30 p-10 text-rose-100">
      <h2 className="text-2xl font-semibold">Preview unavailable</h2>
      <p className="mt-3 text-sm leading-6 text-rose-200/80">{message}</p>
    </div>
  );
}