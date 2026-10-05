"use client";

import { useEffect, useState } from "react";
import {
  ApartmentOutlined,
  CloudUploadOutlined,
  DatabaseOutlined,
  ToolOutlined,
  NotificationOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  FormOutlined,
  AuditOutlined,
  HistoryOutlined,
  IdcardOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ProfileOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Breadcrumb, Button, Layout, Menu, Tooltip, Typography } from "antd";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SearchSelect } from "@/shared/ui/search-select";
import { SiderUserMenu } from "@/shared/ui/sider-user-menu";
import { PageHelpTrigger } from "@/shared/ui/page-help";
import {
  ShellHeaderProvider,
  useShellEmployeeLabel,
  useShellHelpNotes,
} from "@/shared/ui/shell-header-context";
import { writesHelpNote } from "@/shared/ui/writes-help-note";
import {
  employee360Area,
  employee360Title,
} from "@/shared/ui/employee-360-path";

export type ShellEmployer = {
  employerId: number;
  employerName: string;
};

function moduleTitle(
  pathname: string,
  base: string,
  employers: ShellEmployer[],
  employerId: number,
): string {
  if (pathname.startsWith(`${base}/inspector`)) {
    return "Inspector";
  }
  if (pathname.startsWith(`${base}/logs`)) {
    return "Logs";
  }
  if (pathname.startsWith(`${base}/roles`)) {
    return "Roles";
  }
  if (pathname.startsWith(`${base}/fields`)) {
    return "Fields";
  }
  if (pathname.startsWith(`${base}/master-data`)) {
    return "Master Data";
  }
  if (pathname.startsWith(`${base}/data-fix`)) {
    return "Data Fix";
  }
  if (pathname.startsWith(`${base}/workflows`)) {
    return "Workflows";
  }
  if (pathname.startsWith(`${base}/notifications`)) {
    return "Notifications";
  }
  if (pathname.startsWith(`${base}/uploads`)) {
    return "Bulk Uploads";
  }
  if (pathname.startsWith(`${base}/employees/`)) {
    const area = employee360Area(pathname, base);
    return area ? employee360Title(area) : "Profile";
  }
  if (pathname.startsWith(`${base}/employees`)) {
    return "Employees";
  }
  return (
    employers.find((employer) => employer.employerId === employerId)
      ?.employerName ?? "Employer"
  );
}

export function AppShell({
  employerId,
  employers,
  writesEnabled,
  userName,
  environment,
  environments,
  children,
}: {
  employerId: number;
  employers: ShellEmployer[];
  writesEnabled: boolean;
  userName: string;
  environment: string;
  environments: string[];
  children: React.ReactNode;
}): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [shortcutLabel, setShortcutLabel] = useState("Ctrl+B");
  const base = `/employers/${employerId}`;

  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.userAgent)) {
      setShortcutLabel("⌘B");
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (
        event.repeat ||
        event.altKey ||
        event.shiftKey ||
        !(event.ctrlKey || event.metaKey) ||
        event.key.toLowerCase() !== "b"
      ) {
        return;
      }
      event.preventDefault();
      setCollapsed((current) => !current);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const selectedKey = pathname.startsWith(`${base}/logs`)
    ? "logs"
    : pathname.startsWith(`${base}/inspector`)
    ? "inspector"
    : pathname.startsWith(`${base}/roles`)
      ? "roles"
      : pathname.startsWith(`${base}/fields`)
        ? "fields"
        : pathname.startsWith(`${base}/master-data`)
          ? "master-data"
          : pathname.startsWith(`${base}/data-fix`)
            ? "data-fix"
            : pathname.startsWith(`${base}/workflows`)
              ? "workflows"
              : pathname.startsWith(`${base}/notifications`)
                ? "notifications"
                : pathname.startsWith(`${base}/uploads`)
                  ? "uploads"
                  : pathname.startsWith(`${base}/employees`)
                    ? "employees"
                    : "overview";
  const title = moduleTitle(pathname, base, employers, employerId);

  return (
    <ShellHeaderProvider>
      <Layout className="overflow-hidden" hasSider style={{ height: "100vh" }}>
        <Layout.Sider
          className="!h-full !bg-slate-50"
          classNames={{ body: "flex h-full min-h-0 flex-col overflow-hidden" }}
          collapsed={collapsed}
          collapsedWidth={64}
          collapsible
          theme="light"
          trigger={null}
          width={260}
        >
          <div
            className={`flex shrink-0 items-center gap-1 p-2 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            {collapsed ? null : (
              <SearchSelect
                className="min-w-0 flex-1"
                optionFilterProp="label"
                popupMatchSelectWidth={false}
                value={employerId}
                options={employers.map((employer) => ({
                  label: `${employer.employerName} (${employer.employerId})`,
                  value: employer.employerId,
                }))}
                onChange={(nextId: number) => {
                  router.push(`/employers/${nextId}`);
                }}
              />
            )}
            <Tooltip
              placement="right"
              title={`${collapsed ? "Expand menu" : "Collapse menu"} (${shortcutLabel})`}
            >
              <Button
                aria-keyshortcuts="Control+B Meta+B"
                aria-label={collapsed ? "Expand menu" : "Collapse menu"}
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                type="text"
                onClick={() => {
                  setCollapsed((current) => !current);
                }}
              />
            </Tooltip>
          </div>
          <Menu
            className="min-h-0 flex-1 overflow-y-auto !border-e-0 !bg-transparent"
            mode="inline"
            selectedKeys={[selectedKey]}
            items={[
              {
                key: "overview",
                icon: <SettingOutlined />,
                title: "Employer",
                label: <Link href={base}>Employer</Link>,
              },
              {
                key: "employees",
                icon: <UserOutlined />,
                title: "Employees",
                label: <Link href={`${base}/employees`}>Employees</Link>,
              },
              {
                key: "roles",
                icon: <TeamOutlined />,
                title: "Roles",
                label: <Link href={`${base}/roles`}>Roles</Link>,
              },
              {
                key: "fields",
                icon: <FormOutlined />,
                title: "Fields",
                label: <Link href={`${base}/fields`}>Fields</Link>,
              },
              {
                key: "master-data",
                icon: <DatabaseOutlined />,
                title: "Master Data",
                label: <Link href={`${base}/master-data`}>Master Data</Link>,
              },
              {
                key: "data-fix",
                icon: <ToolOutlined />,
                title: "Data Fix",
                label: <Link href={`${base}/data-fix`}>Data Fix</Link>,
              },
              {
                key: "workflows",
                icon: <ApartmentOutlined />,
                title: "Workflows",
                label: <Link href={`${base}/workflows`}>Workflows</Link>,
              },
              {
                key: "notifications",
                icon: <NotificationOutlined />,
                title: "Notifications",
                label: (
                  <Link href={`${base}/notifications`}>Notifications</Link>
                ),
              },
              {
                key: "uploads",
                icon: <CloudUploadOutlined />,
                title: "Bulk Uploads",
                label: <Link href={`${base}/uploads`}>Bulk Uploads</Link>,
              },
              {
                key: "inspector",
                icon: <FileSearchOutlined />,
                title: "Inspector",
                label: <Link href={`${base}/inspector`}>Inspector</Link>,
              },
              {
                key: "logs",
                icon: <HistoryOutlined />,
                title: "Logs",
                label: <Link href={`${base}/logs`}>Logs</Link>,
              },
            ]}
          />
          <SiderUserMenu
            collapsed={collapsed}
            environment={environment}
            environments={environments}
            userName={userName}
            writesEnabled={writesEnabled}
          />
        </Layout.Sider>
        <Layout className="min-h-0 min-w-0 flex-1 overflow-hidden">
          <ShellHeader
            employerId={employerId}
            title={title}
            writesEnabled={writesEnabled}
          />
          <Layout.Content
            className="min-h-0 overflow-auto p-6"
            style={{ minHeight: 0, overflow: "auto" }}
          >
            {children}
          </Layout.Content>
        </Layout>
      </Layout>
    </ShellHeaderProvider>
  );
}

function ShellHeader({
  employerId,
  title,
  writesEnabled,
}: {
  employerId: number;
  title: string;
  writesEnabled: boolean;
}): React.JSX.Element {
  const employeeLabel = useShellEmployeeLabel();
  const helpNotes = useShellHelpNotes();
  const notes = [writesHelpNote(writesEnabled), ...helpNotes];

  return (
    <div className="flex h-14 shrink-0 items-center gap-1 border-b border-slate-200 bg-white px-6">
      {employeeLabel ? (
        <Breadcrumb
          className="text-base font-medium [&_.ant-breadcrumb-link]:text-inherit"
          items={[
            {
              title: (
                <Link href={`/employers/${employerId}/employees`}>
                  Employees
                </Link>
              ),
            },
            { title },
            { title: employeeLabel },
          ]}
        />
      ) : (
        <Typography.Text className="text-base font-medium">
          {title}
        </Typography.Text>
      )}
      <PageHelpTrigger notes={notes} title={title} />
    </div>
  );
}

export function Employee360Nav({
  employerId,
  employmentNumber,
}: {
  employerId: number;
  employmentNumber: string;
}): React.JSX.Element {
  const pathname = usePathname();
  const base = `/employers/${employerId}/employees/${encodeURIComponent(employmentNumber)}`;
  const selectedKey =
    employee360Area(pathname, `/employers/${employerId}`) ?? "profile";

  return (
    <Menu
      className="mb-4"
      mode="horizontal"
      selectedKeys={[selectedKey]}
      items={[
        {
          key: "profile",
          icon: <IdcardOutlined />,
          label: <Link href={base}>Profile</Link>,
        },
        {
          key: "history",
          icon: <HistoryOutlined />,
          label: <Link href={`${base}/history`}>History</Link>,
        },
        {
          key: "change-requests",
          icon: <FileTextOutlined />,
          label: <Link href={`${base}/change-requests`}>Change requests</Link>,
        },
        {
          key: "sections",
          icon: <ProfileOutlined />,
          label: <Link href={`${base}/sections`}>Sections</Link>,
        },
        {
          key: "business-unit",
          icon: <ApartmentOutlined />,
          label: <Link href={`${base}/business-unit`}>Business unit</Link>,
        },
        {
          key: "login",
          icon: <UserOutlined />,
          label: <Link href={`${base}/login`}>Login</Link>,
        },
        {
          key: "access",
          icon: <TeamOutlined />,
          label: <Link href={`${base}/access`}>Access</Link>,
        },
        {
          key: "leave",
          icon: <SettingOutlined />,
          label: <Link href={`${base}/leave`}>Leave</Link>,
        },
        {
          key: "approvers",
          icon: <AuditOutlined />,
          label: <Link href={`${base}/approvers`}>Approvers</Link>,
        },
      ]}
    />
  );
}
