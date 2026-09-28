import type { PageHelpNote } from "@/shared/ui/page-help";
import { PageHelpTrigger } from "@/shared/ui/page-help";
import { Title } from "@/shared/ui/antd-rsc";

export function PageHeader({
  title,
  extra,
  notes = [],
}: {
  title?: string;
  extra?: React.ReactNode;
  notes?: PageHelpNote[];
}): React.JSX.Element {
  if (!title && !extra) {
    return <></>;
  }
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      {title ? (
        <div className="flex items-center gap-1">
          <Title className="!mb-0" level={3}>
            {title}
          </Title>
          <PageHelpTrigger notes={notes} title={title} />
        </div>
      ) : (
        <span />
      )}
      {extra}
    </div>
  );
}
