"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App as AntdApp, ConfigProvider } from "antd";
import { SessionProvider } from "next-auth/react";
import { theme } from "@/shared/theme";

export function AppProviders({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <SessionProvider>
      <AntdRegistry layer>
        <ConfigProvider theme={theme}>
          <AntdApp>{children}</AntdApp>
        </ConfigProvider>
      </AntdRegistry>
    </SessionProvider>
  );
}
