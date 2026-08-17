"use client";

import Link from "next/link";
import {
  signInWithDev,
  signInWithEntra,
  signOutAction,
} from "./auth-actions";

export function AuthMenu({
  configured,
  providers,
  signedInName,
  isAdmin,
}: {
  configured: boolean;
  providers: Array<"microsoft-entra-id" | "dev">;
  signedInName?: string;
  isAdmin: boolean;
}): React.JSX.Element | null {
  if (!configured) return null;

  if (!signedInName) {
    return (
      <div className="flex items-center gap-2">
        {providers.includes("microsoft-entra-id") ? (
          <form action={signInWithEntra}>
            <button
              className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              type="submit"
            >
              Sign in
            </button>
          </form>
        ) : null}
        {providers.includes("dev") ? (
          <form action={signInWithDev}>
            <button
              className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              type="submit"
            >
              Dev sign in
            </button>
          </form>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {isAdmin ? (
        <Link
          className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          href="/features/proposals"
        >
          Proposals
        </Link>
      ) : null}
      <span className="max-w-40 truncate text-sm text-slate-500 dark:text-slate-400">
        {signedInName}
      </span>
      <form action={signOutAction}>
        <button
          className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          type="submit"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
