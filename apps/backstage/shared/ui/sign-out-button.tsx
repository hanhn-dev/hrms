"use client";

import { Button } from "antd";
import { signOut } from "next-auth/react";

export function SignOutButton(): React.JSX.Element {
  return (
    <Button size="small" onClick={() => void signOut({ callbackUrl: "/login" })}>
      Sign out
    </Button>
  );
}
