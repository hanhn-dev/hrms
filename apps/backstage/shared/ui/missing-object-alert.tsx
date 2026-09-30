import { Alert } from "antd";

export function MissingObjectAlert({
  items,
}: {
  items: ReadonlyArray<{ feature: string; objectName: string }>;
}): React.JSX.Element | null {
  const first = items[0];
  if (!first) {
    return null;
  }
  return (
    <Alert
      className="mb-4"
      showIcon
      type="warning"
      title={
        items.length === 1
          ? `${first.feature} is unavailable`
          : "Some sections are unavailable"
      }
      description={items
        .map(
          (item) =>
            `${item.feature} needs ${item.objectName}, which is not in this database yet.`,
        )
        .join(" ")}
    />
  );
}
