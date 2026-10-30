import { captureQueryScript } from "@hrms/db";
import { flattenMenuTree } from "@hrms/db/menu-tree";
import { Card } from "antd";
import { MenuDiagnosisPanel } from "@/features/employer/menu/menu-diagnosis";
import { MenuEditor } from "@/features/employer/menu/menu-editor";
import { getEmployerMenu, getMenuDiagnosis } from "@/features/employer/menu/queries";
import { areWritesEnabled } from "@/shared/auth";
import { getSelectedEnvironment } from "@/shared/db";

export async function MenuDiagnosisSlot({
  employerId,
}: {
  employerId: number;
}): Promise<React.JSX.Element> {
  const [loaded, environment] = await Promise.all([
    captureQueryScript(() => getMenuDiagnosis(employerId)),
    getSelectedEnvironment(),
  ]);
  return (
    <Card className="mb-4" title="What Access Right Management shows">
      <MenuDiagnosisPanel
        diagnosis={loaded.result}
        writesEnabled={areWritesEnabled(environment)}
      />
    </Card>
  );
}

export async function MenuTreeSlot({
  employerId,
}: {
  employerId: number;
}): Promise<React.JSX.Element> {
  const [loaded, environment] = await Promise.all([
    captureQueryScript(() => getEmployerMenu(employerId)),
    getSelectedEnvironment(),
  ]);
  const menu = loaded.result;
  const revision = flattenMenuTree(menu.nodes)
    .map((row) => `${row.menuId}:${row.parentMenuId ?? ""}:${row.menuName}:${row.isActive ? 1 : 0}`)
    .join("|");
  return (
    <Card className="mb-4" title="Menu">
      <MenuEditor
        key={revision}
        employerId={employerId}
        inherited={menu.inherited}
        nodes={menu.nodes}
        writesEnabled={areWritesEnabled(environment)}
      />
    </Card>
  );
}
