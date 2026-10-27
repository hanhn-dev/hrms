import { redirect } from "next/navigation";
import { ForbiddenScreen } from "@/features/auth/forbidden-screen";
import { forbiddenMessage } from "@/features/auth/forbidden-copy";
import { currentGateUser, isAuthDisabled } from "@/shared/auth";

export default async function ForbiddenPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}): Promise<React.JSX.Element> {
  if (isAuthDisabled()) {
    redirect("/");
  }
  const user = await currentGateUser();
  if (!user) {
    redirect("/login");
  }
  const params = await searchParams;
  const message = forbiddenMessage(params.area, user);
  return <ForbiddenScreen body={message.body} title={message.title} />;
}
