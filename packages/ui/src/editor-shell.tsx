import { Layout } from "antd";

export function EditorShell({
  sidebar,
  inspector,
  children,
}: {
  sidebar: React.ReactNode;
  inspector: React.ReactNode;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Layout className="min-h-screen bg-transparent">
      <Layout.Sider
        theme="dark"
        width={280}
        role="complementary"
        aria-label="Project context and layer navigation"
        className="border-r border-slate-800/80 bg-slate-950/90"
      >
        {sidebar}
      </Layout.Sider>
      <Layout.Content role="main" aria-label="Editor canvas workspace" tabIndex={-1} className="bg-transparent">
        {children}
      </Layout.Content>
      <Layout.Sider
        theme="dark"
        width={320}
        role="complementary"
        aria-label="Editing properties and publishing controls"
        className="border-l border-slate-800/80 bg-slate-950/90"
      >
        {inspector}
      </Layout.Sider>
    </Layout>
  );
}