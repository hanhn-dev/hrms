import { Card, Tag } from "antd";

export interface ImportReviewItem {
  readonly id: string;
  readonly title: string;
  readonly reason: string;
}

export function ImportReview({
  items,
}: {
  items: readonly ImportReviewItem[];
}): React.JSX.Element {
  return (
    <Card title="Manual Review" className="border-slate-800 bg-slate-950/80 text-slate-100">
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">No manual review items</p>
      ) : (
        <ul className="grid gap-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-2xl border border-slate-800 px-4 py-3">
              <div className="flex flex-col gap-2">
                <span className="font-medium text-slate-100">{item.title}</span>
                <Tag color="cyan">{item.reason}</Tag>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}