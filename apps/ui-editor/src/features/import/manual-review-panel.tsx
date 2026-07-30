import type React from "react";

import { ImportReview } from "@hrms/ui/import-review";

import type { ManualReviewRegion } from "../../schemas/design-project";

export function ManualReviewPanel({
  items,
}: {
  items: readonly ManualReviewRegion[];
}): React.JSX.Element {
  return (
    <ImportReview
      items={items.map((item) => ({
        id: item.id,
        title: item.note,
        reason: item.reason.replace(/_/g, " "),
      }))}
    />
  );
}