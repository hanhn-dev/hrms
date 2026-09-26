import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      isRootAdmin: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    isRootAdmin?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    isRootAdmin?: boolean;
  }
}
