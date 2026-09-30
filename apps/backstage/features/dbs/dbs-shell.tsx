"use client";

import { DatabaseOutlined, HomeOutlined } from "@ant-design/icons";
import { Button, Layout, Typography } from "antd";
import Link from "next/link";
import { SearchSelect } from "@/shared/ui/search-select";
import { SiderUserMenu } from "@/shared/ui/sider-user-menu";
import { PageHelpTrigger } from "@/shared/ui/page-help";
import {
  ShellHeaderProvider,
  useShellHelpNotes,
} from "@/shared/ui/shell-header-context";
import { writesHelpNote } from "@/shared/ui/writes-help-note";
import type { EmployerOption } from "@/features/dbs/queries";

export function DbsShell({
  userName,
  environment,
  environments,
  writesEnabled,
  employers,
  employerId,
  onEmployerChange,
  children,
}: {
  userName: string;
  environment: string;
  environments: string[];
  writesEnabled: boolean;
  employers: EmployerOption[];
  employerId: number | null;
  onEmployerChange: (employerId: number | null) => void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <ShellHeaderProvider>
      <Layout className="overflow-hidden" style={{ height: "100vh" }}>
        <Layout.Header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 !bg-white !px-4">
          <DatabaseOutlined className="text-lg text-slate-700" />
          <Typography.Text className="text-base font-medium">
            Data Builder Studio
          </Typography.Text>
          <DbsHelp writesEnabled={writesEnabled} />
          <div className="ml-auto flex items-center gap-3">
            <SearchSelect
              allowClear
              optionFilterProp="label"
              className="w-64"
              placeholder="Employer filter (optional)"
              value={employerId ?? undefined}
              options={employers.map((employer) => ({
                label: `${employer.employerName} (${employer.employerId})`,
                value: employer.employerId,
              }))}
              onChange={(value: number | undefined) => {
                onEmployerChange(value ?? null);
              }}
            />
            <Link href="/employers">
              <Button icon={<HomeOutlined />}>Employers</Button>
            </Link>
            <SiderUserMenu
              collapsed={false}
              environment={environment}
              environments={environments}
              userName={userName}
              writesEnabled={writesEnabled}
            />
          </div>
        </Layout.Header>
        <Layout.Content className="relative min-h-0 flex-1 overflow-hidden bg-slate-50">
          {children}
        </Layout.Content>
      </Layout>
    </ShellHeaderProvider>
  );
}

function DbsHelp({
  writesEnabled,
}: {
  writesEnabled: boolean;
}): React.JSX.Element {
  const helpNotes = useShellHelpNotes();
  const notes = [writesHelpNote(writesEnabled), ...helpNotes];
  return (
    <PageHelpTrigger notes={notes} title="Data Builder Studio" />
  );
}
