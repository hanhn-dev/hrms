import {
  ALLOWED_HOST_MATCH_PATTERNS,
  hostToMatchPatterns,
  isAllowedPageUrl,
  matchesExtraHostname,
  normalizeCustomHostInput,
} from "./allowed-hosts";

describe("ALLOWED_HOST_MATCH_PATTERNS", () => {
  it("lists localhost and TDG hosts (positive)", () => {
    expect(ALLOWED_HOST_MATCH_PATTERNS).toEqual([
      "*://localhost/*",
      "*://*.localhost/*",
      "*://127.0.0.1/*",
      "*://[::1]/*",
      "*://thedigitalgroup.com/*",
      "*://*.thedigitalgroup.com/*",
    ]);
  });

  it("does not match every site (negative)", () => {
    expect(ALLOWED_HOST_MATCH_PATTERNS).not.toContain("<all_urls>");
    expect(ALLOWED_HOST_MATCH_PATTERNS.some((p) => p.includes("*://*/*"))).toBe(
      false,
    );
  });

  it("includes apex TDG because Chrome *.host skips the root domain (edge)", () => {
    expect(ALLOWED_HOST_MATCH_PATTERNS).toContain("*://thedigitalgroup.com/*");
    expect(ALLOWED_HOST_MATCH_PATTERNS).toContain(
      "*://*.thedigitalgroup.com/*",
    );
  });
});

describe("normalizeCustomHostInput", () => {
  it("parses hostnames and URLs (positive)", () => {
    expect(normalizeCustomHostInput("uat.example.com")).toBe("uat.example.com");
    expect(normalizeCustomHostInput("https://uat.example.com/app")).toBe(
      "uat.example.com",
    );
    expect(normalizeCustomHostInput("*://qa.customer.com/*")).toBe(
      "qa.customer.com",
    );
  });

  it("rejects wildcards and empty input (negative)", () => {
    expect(normalizeCustomHostInput("<all_urls>")).toBeNull();
    expect(normalizeCustomHostInput("*://*/*")).toBeNull();
    expect(normalizeCustomHostInput("")).toBeNull();
    expect(normalizeCustomHostInput("   ")).toBeNull();
  });

  it("handles nullish and odd shapes (edge)", () => {
    expect(normalizeCustomHostInput(null)).toBeNull();
    expect(normalizeCustomHostInput(undefined)).toBeNull();
    expect(normalizeCustomHostInput("host with spaces")).toBeNull();
  });
});

describe("isAllowedPageUrl", () => {
  it("allows localhost, loopback, and TDG hosts (positive)", () => {
    expect(isAllowedPageUrl("http://localhost:9100/")).toBe(true);
    expect(isAllowedPageUrl("https://localhost/path")).toBe(true);
    expect(isAllowedPageUrl("http://127.0.0.1:3000/foo")).toBe(true);
    expect(isAllowedPageUrl("http://[::1]:5173/")).toBe(true);
    expect(isAllowedPageUrl("http://app.localhost:5173/")).toBe(true);
    expect(isAllowedPageUrl("https://thedigitalgroup.com/")).toBe(true);
    expect(
      isAllowedPageUrl("https://hrms.thedigitalgroup.com/HRM/Search.aspx"),
    ).toBe(true);
  });

  it("allows custom extra hosts (positive)", () => {
    expect(
      isAllowedPageUrl("https://uat.customer.com/HRM", ["uat.customer.com"]),
    ).toBe(true);
    expect(
      isAllowedPageUrl("https://app.uat.customer.com/", ["uat.customer.com"]),
    ).toBe(true);
  });

  it("rejects unrelated hosts and lookalikes (negative)", () => {
    expect(isAllowedPageUrl("https://google.com")).toBe(false);
    expect(isAllowedPageUrl("https://thedigitalgroup.com.evil.com")).toBe(
      false,
    );
    expect(isAllowedPageUrl("https://notthedigitalgroup.com")).toBe(false);
    expect(isAllowedPageUrl("https://localhost.example.com")).toBe(false);
    expect(isAllowedPageUrl("chrome://extensions")).toBe(false);
    expect(isAllowedPageUrl("file:///tmp/form.html")).toBe(false);
    expect(isAllowedPageUrl("https://evil.com", ["uat.customer.com"])).toBe(
      false,
    );
  });

  it("handles empty, invalid, and unusual input (edge)", () => {
    expect(isAllowedPageUrl(undefined)).toBe(false);
    expect(isAllowedPageUrl(null)).toBe(false);
    expect(isAllowedPageUrl("")).toBe(false);
    expect(isAllowedPageUrl("   ")).toBe(false);
    expect(isAllowedPageUrl("not a url")).toBe(false);
    expect(isAllowedPageUrl("HTTP://LOCALHOST/")).toBe(true);
    expect(isAllowedPageUrl("https://FOO.BAR.thedigitalgroup.com/a")).toBe(
      true,
    );
  });
});

describe("matchesExtraHostname / hostToMatchPatterns", () => {
  it("matches exact and subdomain extras (positive)", () => {
    expect(matchesExtraHostname("uat.example.com", ["uat.example.com"])).toBe(
      true,
    );
    expect(matchesExtraHostname("a.uat.example.com", ["uat.example.com"])).toBe(
      true,
    );
  });

  it("does not match sibling domains (negative)", () => {
    expect(
      matchesExtraHostname("notuat.example.com", ["uat.example.com"]),
    ).toBe(false);
  });

  it("builds match patterns (edge)", () => {
    expect(hostToMatchPatterns("uat.example.com")).toEqual([
      "*://uat.example.com/*",
    ]);
    expect(hostToMatchPatterns("")).toEqual([]);
  });
});
