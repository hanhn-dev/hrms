"use server";

import { signIn, signOut } from "@/auth";
import { safeCallbackPath } from "@/shared/auth/access";

export async function signInWithEntra(formData: FormData): Promise<void> {
  await signIn("microsoft-entra-id", {
    redirectTo: safeCallbackPath(String(formData.get("callbackUrl") ?? "")),
  });
}

export async function signInWithDev(formData: FormData): Promise<void> {
  await signIn("dev", {
    redirectTo: safeCallbackPath(String(formData.get("callbackUrl") ?? "")),
  });
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}

export async function signOutToLogin(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
