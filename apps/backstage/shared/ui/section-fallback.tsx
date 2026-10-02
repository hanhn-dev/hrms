import { Card, Skeleton } from "antd";

export function SectionFallback({ title }: { title: string }): React.JSX.Element {
  return (
    <Card className="mb-4" title={title}>
      <Skeleton active paragraph={{ rows: 4 }} />
    </Card>
  );
}
