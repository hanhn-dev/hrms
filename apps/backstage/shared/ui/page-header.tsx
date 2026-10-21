import type { PageHelpNote } from "@/shared/ui/page-help";
import { PageHelpTrigger } from "@/shared/ui/page-help";
import { Title } from "@/shared/ui/antd-rsc";

export function PageHeader({
  title,
  extra,
  notes = [],
  compact = false,
}: {
  title?: string;
  extra?: React.ReactNode;
  notes?: PageHelpNote[];
  /** Tighter title and spacing for dense operator screens. */
  compact?: boolean;
}): React.JSX.Element {
  if (!title && !extra) {
    return <></>;
  }
  return (
    <div
      className={`flex flex-wrap items-center justify-between ${
        compact ? "mb-2 gap-2" : "mb-4 gap-3"
      }`}
    >
      {title ? (
        <div className="flex items-center gap-1">
          <Title className="!mb-0" level={compact ? 4 : 3}>
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
