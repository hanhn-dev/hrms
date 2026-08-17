"use client";

import { useEffect, useState } from "react";
import { AuthMenu } from "./auth-menu";

interface SessionState {
  configured: boolean;
  providers: Array<"microsoft-entra-id" | "dev">;
  user: { name?: string; isAdmin: boolean } | null;
}

export function AuthStatus(): React.JSX.Element | null {
  const [state, setState] = useState<SessionState | undefined>();

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/session")
      .then((response) => response.json() as Promise<SessionState>)
      .then((next) => {
        if (!cancelled) setState(next);
      })
      .catch(() => {
        if (!cancelled) {
          setState({ configured: false, providers: [], user: null });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!state) return null;

  return (
    <AuthMenu
      configured={state.configured}
      isAdmin={Boolean(state.user?.isAdmin)}
      providers={state.providers}
      signedInName={state.user?.name}
    />
  );
}
