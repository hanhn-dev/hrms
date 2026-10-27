import { redirect } from "next/navigation";
import { isDevAuthEnabled, isEntraConfigured } from "@/auth";
import { LoginScreen } from "@/features/auth";
import {
  currentGateUser,
  isAuthDisabled,
  safeCallbackPath,
} from "@/shared/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}): Promise<React.JSX.Element> {
  if (isAuthDisabled()) {
    redirect("/");
  }
  const user = await currentGateUser();
  const params = await searchParams;
  const callbackUrl = safeCallbackPath(params.callbackUrl);
  if (user) {
    redirect(callbackUrl);
  }
  return (
    <LoginScreen
      callbackUrl={callbackUrl}
      dev={isDevAuthEnabled()}
      entra={isEntraConfigured()}
      error={params.error}
    />
  );
}
