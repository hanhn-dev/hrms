"use client";

import { useEffect, useState } from "react";
import { AuthMenu } from "./auth-menu";

export interface BackstageSessionState {
  configured: boolean;
  authDisabled: boolean;
  providers: Array<"microsoft-entra-id" | "dev">;
  user: { name?: string; isAdmin: boolean; roles: string[] } | null;
}

export function useBackstageSession(): BackstageSessionState | undefined {
  const [state, setState] = useState<BackstageSessionState | undefined>();

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/session")
      .then((response) => response.json() as Promise<BackstageSessionState>)
      .then((next) => {
        if (!cancelled) setState(next);
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            configured: false,
            authDisabled: false,
            providers: [],
            user: null,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export function AuthStatus(): React.JSX.Element | null {
  const state = useBackstageSession();
  if (!state) return null;

  return (
    <AuthMenu
      authDisabled={state.authDisabled}
      configured={state.configured}
      isAdmin={Boolean(state.user?.isAdmin)}
      providers={state.providers}
      signedInName={state.authDisabled ? "Auth off" : state.user?.name}
    />
  );
}
