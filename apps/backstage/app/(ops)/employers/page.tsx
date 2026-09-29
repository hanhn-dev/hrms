import { redirect } from "next/navigation";
import { EmployerPickerScreen } from "@/features/employer/picker";
import { auth } from "@/shared/auth";

export default async function HomePage(): Promise<React.JSX.Element> {
  const session = await auth();
  if (!session?.user?.isRootAdmin) {
    redirect("/login");
  }
  return <EmployerPickerScreen userName={session.user.name ?? "Root Admin"} />;
}
