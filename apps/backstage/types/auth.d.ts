import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      oid: string;
      roles: string[];
      isAdmin: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    oid?: string;
    roles?: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    oid?: string;
    roles?: string[];
  }
}
