"use server";

import { signIn, signOut } from "@/auth";

export async function signInWithEntra(): Promise<void> {
  await signIn("microsoft-entra-id");
}

export async function signInWithDev(): Promise<void> {
  await signIn("dev");
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
