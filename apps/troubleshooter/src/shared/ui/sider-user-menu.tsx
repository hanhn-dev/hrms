"use client";

import { LogoutOutlined } from "@ant-design/icons";
import { Avatar, Dropdown, Tooltip } from "antd";
import { signOut } from "next-auth/react";
import { EnvironmentSelect } from "@/shared/ui/environment-select";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  const first = parts[0] ?? "";
  const last = parts[parts.length - 1] ?? first;
  if (parts.length === 1) {
    return first.slice(0, 2).toUpperCase();
  }
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export function SiderUserMenu({
  collapsed,
  userName,
  writesEnabled,
  environment,
  environments,
}: {
  collapsed: boolean;
  userName: string;
  writesEnabled: boolean;
  environment: string;
  environments: string[];
}): React.JSX.Element {
  const initials = initialsFromName(userName);
  const roleLabel = writesEnabled ? "Writes on" : "Read-only";

  return (
    <div
      className={`mx-2 mb-2 flex w-[calc(100%-1rem)] items-center gap-1 rounded-full p-1.5 hover:bg-slate-100 ${
        collapsed ? "justify-center" : ""
      }`}
    >
      <Dropdown
        placement={collapsed ? "rightBottom" : "topLeft"}
        trigger={["click"]}
        menu={{
          className: "!border-0 !bg-transparent !p-1 !shadow-none",
          items: [
            {
              key: "signout",
              icon: <LogoutOutlined />,
              label: "Sign out",
            },
          ],
          onClick: ({ key }) => {
            if (key === "signout") {
              void signOut({ callbackUrl: "/login" });
            }
          },
        }}
        popupRender={(menus) => (
          <div className="min-w-56 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200">
            <div className="flex items-center gap-2 px-3 py-2.5">
              <Avatar size={28} style={{ backgroundColor: "#fa8c16", flexShrink: 0 }}>
                {initials}
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-900">
                  {userName}
                </div>
                <div className="truncate text-xs text-slate-500">{roleLabel}</div>
              </div>
              <EnvironmentSelect
                className="shrink-0"
                environment={environment}
                environments={environments}
              />
            </div>
            <div className="border-t border-slate-100" />
            {menus}
          </div>
        )}
      >
        <Tooltip
          placement="right"
          title={collapsed ? `${userName} · ${environment}` : undefined}
        >
          <button
            className="flex shrink-0 items-center border-0 bg-transparent p-0"
            type="button"
          >
            <Avatar size={28} style={{ backgroundColor: "#fa8c16", flexShrink: 0 }}>
              {initials}
            </Avatar>
          </button>
        </Tooltip>
      </Dropdown>
      {collapsed ? null : (
        <>
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-slate-900">
              {userName}
            </span>
            <span className="block truncate text-xs text-slate-500">{roleLabel}</span>
          </div>
          <EnvironmentSelect
            className="shrink-0"
            environment={environment}
            environments={environments}
          />
        </>
      )}
    </div>
  );
}
