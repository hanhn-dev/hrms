"use client";

import { useEffect, useState } from "react";
import {
  FormOutlined,
  IdcardOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Breadcrumb, Button, Layout, Menu, Select, Tooltip, Typography } from "antd";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SiderUserMenu } from "@/shared/ui/sider-user-menu";
import {
  ShellHeaderProvider,
  useShellEmployeeLabel,
} from "@/shared/ui/shell-header-context";

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
  if (pathname.startsWith(`${base}/roles`)) {
    return "Roles";
  }
  if (pathname.startsWith(`${base}/fields`)) {
    return "Fields";
  }
  if (pathname.startsWith(`${base}/employees/`)) {
    if (pathname.endsWith("/leave")) {
      return "Leave";
    }
    if (pathname.endsWith("/access")) {
      return "Access";
    }
    if (pathname.endsWith("/login")) {
      return "Login";
    }
    return "Profile";
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

  const selectedKey = pathname.startsWith(`${base}/roles`)
    ? "roles"
    : pathname.startsWith(`${base}/fields`)
      ? "fields"
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
              <Select
                className="min-w-0 flex-1"
                optionFilterProp="label"
                popupMatchSelectWidth={false}
                showSearch
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
          <ShellHeader title={title} />
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

function ShellHeader({ title }: { title: string }): React.JSX.Element {
  const employeeLabel = useShellEmployeeLabel();

  return (
    <div className="flex h-14 shrink-0 items-center border-b border-slate-200 bg-white px-6">
      {employeeLabel ? (
        <Breadcrumb
          className="text-base font-medium [&_.ant-breadcrumb-link]:text-inherit"
          items={[{ title }, { title: employeeLabel }]}
        />
      ) : (
        <Typography.Text className="text-base font-medium">
          {title}
        </Typography.Text>
      )}
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
  const selectedKey = pathname.endsWith("/leave")
    ? "leave"
    : pathname.endsWith("/access")
      ? "access"
      : pathname.endsWith("/login")
        ? "login"
        : "profile";

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
      ]}
    />
  );
}
