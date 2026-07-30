import type React from "react";

import type { ManualReviewRegion } from "../../schemas/design-project";

export function ManualReviewOverlay({
  regions,
}: {
  regions: readonly ManualReviewRegion[];
}): React.JSX.Element {
  return (
    <>
      {regions.map((region) => (
        <div
          key={region.id}
          className="pointer-events-none absolute border border-dashed border-amber-300/80 bg-amber-300/10"
          style={{
            left: region.bounds.x,
            top: region.bounds.y,
            width: region.bounds.width,
            height: region.bounds.height,
          }}
        >
          <span className="absolute left-2 top-2 rounded-full bg-amber-300 px-2 py-1 text-xs font-medium text-slate-950">
            Review
          </span>
        </div>
      ))}
    </>
  );
}