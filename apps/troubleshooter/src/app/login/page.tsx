import { redirect } from "next/navigation";
import { LoginScreen } from "@/features/auth";
import { auth, isAuthConfigured } from "@/shared/auth";

export default async function LoginPage(): Promise<React.JSX.Element> {
  const session = await auth();
  if (session?.user?.isRootAdmin) {
    redirect("/");
  }
  return <LoginScreen configured={isAuthConfigured()} />;
}
