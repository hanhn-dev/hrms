"use client";

import { Button } from "antd";
import { signOut } from "next-auth/react";

export function SignOutButton(): React.JSX.Element {
  return (
    <Button size="small" onClick={() => void signOut({ callbackUrl: "/features/login" })}>
      Sign out
    </Button>
  );
}
