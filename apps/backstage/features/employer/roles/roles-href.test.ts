import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { roleGrantsHref, rolesListHref } from "./roles-href.ts";

describe("rolesListHref", () => {
  it("omits page 1 and an empty search", () => {
    assert.equal(
      rolesListHref(4, { page: 1, q: null, roleId: 9 }),
      "/employers/4/roles?roleId=9",
    );
  });

  it("keeps the role and the grant query while paging roles", () => {
    assert.equal(
      rolesListHref(4, { page: 2, q: "adm", roleId: 9, grantPage: 3, grantQ: "menu" }),
      "/employers/4/roles?roleId=9&gpage=3&gq=menu&q=adm&page=2",
    );
  });
});

describe("roleGrantsHref", () => {
  it("pages grants without clearing the roles search", () => {
    assert.equal(
      roleGrantsHref(4, { page: 2, q: "adm", roleId: 9, grantPage: 3, grantQ: "menu" }),
      "/employers/4/roles?roleId=9&page=2&q=adm&gq=menu&gpage=3",
    );
  });
});
