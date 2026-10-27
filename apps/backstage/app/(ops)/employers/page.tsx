import { EmployerPickerScreen } from "@/features/employer/picker";
import { requireFeaturePage } from "@/shared/auth";

export default async function HomePage(): Promise<React.JSX.Element> {
  const user = await requireFeaturePage("employers");
  return <EmployerPickerScreen userName={user.name ?? "Signed in"} />;
}
