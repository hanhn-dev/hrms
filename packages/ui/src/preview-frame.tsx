import { Card } from "antd";

export function PreviewFrame({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Card title={title} className="border-slate-800 bg-slate-950/70 text-slate-100">
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        {children}
      </div>
    </Card>
  );
}