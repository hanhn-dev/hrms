import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  ADMIN_ROLE,
  canAccess,
  decideAccess,
  featureForPath,
  isAuthDisabled,
  rolesFromDevEnv,
  safeCallbackPath,
} from "./access.ts";

describe("isAuthDisabled", () => {
  it("is on only outside production when the flag is 1", () => {
    assert.equal(
      isAuthDisabled({
        NODE_ENV: "development",
        BACKSTAGE_AUTH_DISABLED: "1",
      }),
      true,
    );
    assert.equal(
      isAuthDisabled({ NODE_ENV: "test", BACKSTAGE_AUTH_DISABLED: "1" }),
      true,
    );
    assert.equal(
      isAuthDisabled({
        NODE_ENV: "production",
        BACKSTAGE_AUTH_DISABLED: "1",
      }),
      false,
    );
    assert.equal(
      isAuthDisabled({
        NODE_ENV: "development",
        BACKSTAGE_AUTH_DISABLED: "0",
      }),
      false,
    );
  });
});

describe("rolesFromDevEnv", () => {
  it("reads a comma-separated role list and the admin flag", () => {
    assert.deepEqual(rolesFromDevEnv({}), []);
    assert.deepEqual(
      rolesFromDevEnv({ BACKSTAGE_DEV_ROLES: " Backstage.Azure, ,Backstage.Dbs " }),
      ["Backstage.Azure", "Backstage.Dbs"],
    );
    assert.deepEqual(
      rolesFromDevEnv({
        BACKSTAGE_DEV_ADMIN: "1",
        BACKSTAGE_DEV_ROLES: "Backstage.Azure",
      }),
      [ADMIN_ROLE, "Backstage.Azure"],
    );
  });
});

describe("canAccess", () => {
  it("allows a matching role and treats Backstage.Admin as every area", () => {
    assert.equal(canAccess([], "employers"), false);
    assert.equal(canAccess(["Backstage.Azure"], "azure"), true);
    assert.equal(canAccess(["Backstage.Azure"], "employers"), false);
    assert.equal(canAccess([ADMIN_ROLE], "dbs"), true);
    assert.equal(canAccess([ADMIN_ROLE], "guides"), true);
  });
});

describe("featureForPath", () => {
  it("maps operator areas and keeps proposal filing open to any signed-in user", () => {
    assert.equal(featureForPath("/docs"), null);
    assert.equal(featureForPath("/employers/4/roles"), "employers");
    assert.equal(featureForPath("/dbs"), "dbs");
    assert.equal(featureForPath("/api/azure/roadmap"), "azure");
    assert.equal(featureForPath("/docs/guides/proposals"), "guides");
    assert.equal(featureForPath("/docs/guides/proposals/abc"), null);
    assert.equal(featureForPath("/api/guides/proposals", "GET"), "guides");
    assert.equal(featureForPath("/api/guides/proposals", "POST"), null);
    assert.equal(
      featureForPath("/api/guides/proposals/abc/approve", "POST"),
      "guides",
    );
    assert.equal(featureForPath("/api/guides/proposals/abc/withdraw", "POST"), null);
    assert.equal(featureForPath("/api/search"), null);
  });
});

describe("decideAccess", () => {
  it("denies anonymous visitors and allows signed-in readers on docs", () => {
    assert.deepEqual(
      decideAccess({
        pathname: "/docs",
        authDisabled: false,
        session: null,
      }),
      { kind: "login" },
    );
    assert.deepEqual(
      decideAccess({
        pathname: "/wiki/domain",
        authDisabled: false,
        session: { roles: [] },
      }),
      { kind: "allow" },
    );
    assert.deepEqual(
      decideAccess({
        pathname: "/api/search",
        authDisabled: false,
        session: null,
      }),
      { kind: "json", status: 401, error: "Sign in required" },
    );
  });

  it("denies each operator path without its role and allows Backstage.Admin", () => {
    for (const [pathname, area] of [
      ["/employers", "employers"],
      ["/dbs/canvas", "dbs"],
      ["/azure/board", "azure"],
      ["/docs/guides/proposals", "guides"],
    ] as const) {
      assert.equal(
        decideAccess({
          pathname,
          authDisabled: false,
          session: { roles: [] },
        }).kind === "forbidden" &&
          (
            decideAccess({
              pathname,
              authDisabled: false,
              session: { roles: [] },
            }) as { area: string }
          ).area,
        area,
      );
      assert.deepEqual(
        decideAccess({
          pathname,
          authDisabled: false,
          session: { roles: [ADMIN_ROLE] },
        }),
        { kind: "allow" },
      );
    }
  });

  it("returns 403 for an API area the session cannot open", () => {
    assert.deepEqual(
      decideAccess({
        pathname: "/api/azure/roadmap",
        method: "POST",
        authDisabled: false,
        session: { roles: ["Backstage.Employers"] },
      }),
      { kind: "json", status: 403, error: "Backstage.Azure role required" },
    );
  });

  it("allows every path when auth is disabled and leaves the login page public", () => {
    assert.deepEqual(
      decideAccess({
        pathname: "/employers",
        authDisabled: true,
        session: null,
      }),
      { kind: "allow" },
    );
    assert.deepEqual(
      decideAccess({
        pathname: "/login",
        authDisabled: false,
        session: null,
      }),
      { kind: "allow" },
    );
    assert.deepEqual(
      decideAccess({
        pathname: "/api/session",
        authDisabled: false,
        session: null,
      }),
      { kind: "allow" },
    );
    assert.deepEqual(
      decideAccess({
        pathname: "/api/auth/callback/microsoft-entra-id",
        authDisabled: false,
        session: null,
      }),
      { kind: "allow" },
    );
  });
});

describe("safeCallbackPath", () => {
  it("keeps in-app paths and drops external or auth pages", () => {
    assert.equal(safeCallbackPath("/azure/board?team=1"), "/azure/board?team=1");
    assert.equal(safeCallbackPath("https://evil.example"), "/");
    assert.equal(safeCallbackPath("//evil.example"), "/");
    assert.equal(safeCallbackPath("/login?error=AccessDenied"), "/");
    assert.equal(safeCallbackPath(""), "/");
  });
});
