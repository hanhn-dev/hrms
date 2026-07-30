import { Card } from "antd";

export function PropertyPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Card title={title} className="border-slate-800 bg-slate-950/80 text-slate-100">
      {children}
    </Card>
  );
}