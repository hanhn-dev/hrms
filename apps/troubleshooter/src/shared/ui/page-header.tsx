import { Title } from "@/shared/ui/antd-rsc";

export function PageHeader({
  title,
  extra,
}: {
  title?: string;
  extra?: React.ReactNode;
}): React.JSX.Element {
  if (!title && !extra) {
    return <></>;
  }
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      {title ? (
        <Title className="!mb-0" level={3}>
          {title}
        </Title>
      ) : (
        <span />
      )}
      {extra}
    </div>
  );
}
