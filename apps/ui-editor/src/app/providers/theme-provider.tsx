import type React from "react";
import { ConfigProvider, theme } from "antd";

export function ThemeProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: "#22d3ee",
          colorBgBase: "#020617",
          colorTextBase: "#f8fafc",
          borderRadius: 18,
          fontSize: 14,
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}