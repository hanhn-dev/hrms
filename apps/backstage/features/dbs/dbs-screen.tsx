"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { DbsShell } from "@/features/dbs/dbs-shell";
import {
  listEmployerOptions,
  type EmployerOption,
} from "@/features/dbs/queries";
import { PageHelp } from "@/shared/ui/shell-header-context";

const DbsStudio = dynamic(
  () =>
    import("@/features/dbs/canvas/dbs-studio").then((mod) => mod.DbsStudio),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        Loading canvas…
      </div>
    ),
  },
);

export function DbsScreenClient({
  userName,
  environment,
  environments,
  writesEnabled,
  initialEmployers,
}: {
  userName: string;
  environment: string;
  environments: string[];
  writesEnabled: boolean;
  initialEmployers: EmployerOption[];
}): React.JSX.Element {
  const [employerId, setEmployerId] = useState<number | null>(null);
  const [employers, setEmployers] = useState(initialEmployers);

  useEffect(() => {
    if (initialEmployers.length > 0) {
      return;
    }
    let cancelled = false;
    void listEmployerOptions()
      .then((rows) => {
        if (!cancelled) {
          setEmployers(rows);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEmployers([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [initialEmployers.length]);

  return (
    <DbsShell
      userName={userName}
      environment={environment}
      environments={environments}
      writesEnabled={writesEnabled}
      employers={employers}
      employerId={employerId}
      onEmployerChange={setEmployerId}
    >
      <PageHelp
        source="data-builder-studio"
        notes={[
          {
            id: "canvas",
            type: "info",
            title: "Canvas-first exploration",
            description:
              "Search and pin tables, views, procedures, and functions. Open a node for columns, rows, script, and dependencies.",
          },
          {
            id: "select-only",
            type: "info",
            title: "SELECT-only SQL",
            description:
              "Run SQL accepts a single SELECT or WITH…SELECT. DML, DDL, and EXEC are blocked.",
          },
          {
            id: "sp-execute",
            type: "warning",
            title: "Stored procedure execute",
            description:
              "Procedure run uses the same writes gate as other ops tools: preview then confirm. Disabled when writes are off.",
          },
          {
            id: "employer",
            type: "info",
            title: "Optional employer filter",
            description:
              "Pick an employer in the header to scope row preview and value search when tables have EmployerId.",
          },
          {
            id: "compare",
            type: "info",
            title: "Environment compare",
            description:
              "Compare object presence and definitions against another TROUBLESHOOTER_DB_* environment. Read-only.",
          },
        ]}
      />
      <DbsStudio employerId={employerId} writesEnabled={writesEnabled} />
    </DbsShell>
  );
}
