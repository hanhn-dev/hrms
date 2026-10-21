import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { accountMenuLinks, signOutMenuItem } from "./account-menu-links.ts";

describe("accountMenuLinks", () => {
  it("lists All employers and the site destinations in menu order", () => {
    assert.deepEqual(
      accountMenuLinks.map((link) => ({
        key: link.key,
        label: link.label,
        href: link.href,
      })),
      [
        { key: "home", label: "All employers", href: "/employers" },
        { key: "docs", label: "Docs", href: "/docs" },
        { key: "wiki", label: "Wiki", href: "/wiki" },
        { key: "dbs", label: "Data Builder Studio", href: "/dbs" },
        { key: "azure", label: "Azure DevOps", href: "/azure" },
        { key: "flows", label: "Flows", href: "/flows" },
        { key: "settings", label: "Settings", href: "/settings" },
      ],
    );
  });

  it("keeps Sign out as an action with no route", () => {
    assert.deepEqual(signOutMenuItem, { key: "signout", label: "Sign out" });
    assert.equal("href" in signOutMenuItem, false);
    assert.equal(
      accountMenuLinks.some((link) => link.key === signOutMenuItem.key),
      false,
    );
  });
});
