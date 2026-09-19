import { ConfigProvider, App as AntApp } from "antd";
import { PopupPanel } from "@/features/popup";

export function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#1677ff",
          borderRadius: 6,
          fontFamily:
            '"Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        },
      }}
    >
      <AntApp>
        <PopupPanel />
      </AntApp>
    </ConfigProvider>
  );
}
