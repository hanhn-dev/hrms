import { Suspense } from "react";
import { BoardScreen } from "@/features/azure/board";
import { requireRootAdminPage } from "@/shared/auth";
import { SectionFallback } from "@/shared/ui/section-fallback";

function parseView(value: string | undefined): "board" | "people" {
  return value === "people" ? "people" : "board";
}

function parseList(value: string | string[] | undefined): string[] {
  const values = value == null ? [] : Array.isArray(value) ? value : [value];
  return values.map((entry) => entry.trim()).filter((entry) => entry.length > 0);
}

type BoardSearchParams = {
  team?: string;
  iteration?: string;
  member?: string | string[];
  type?: string | string[];
  q?: string;
  view?: string;
  summary?: string;
};

export default function AzureBoardPage({
  searchParams,
}: {
  searchParams: Promise<BoardSearchParams>;
}): React.JSX.Element {
  return (
    <Suspense fallback={<SectionFallback title="Sprint board" />}>
      <AzureBoardPageBody searchParams={searchParams} />
    </Suspense>
  );
}

async function AzureBoardPageBody({
  searchParams,
}: {
  searchParams: Promise<BoardSearchParams>;
}): Promise<React.JSX.Element> {
  await requireRootAdminPage();
  const params = await searchParams;
  return (
    <BoardScreen
      assignees={parseList(params.member)}
      iteration={params.iteration}
      query={params.q}
      showSummary={params.summary !== "hide"}
      team={params.team}
      types={parseList(params.type)}
      view={parseView(params.view)}
    />
  );
}
