import { expect, test } from "playwright/test";

test("imports an html snapshot and opens the editor", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("tab", { name: /html snapshot/i }).click();
  await page.getByLabel(/source label/i).fill("Marketing hero");
  await page.getByLabel(/original url/i).fill("https://example.com");
  await page.getByLabel(/html markup/i).fill("<main><h1>Hello</h1><p>World</p></main>");
  await page.getByRole("button", { name: /create draft from html/i }).click();

  await expect(page).toHaveURL(/\/projects\//i);
  await expect(page.getByRole("heading", { name: /marketing hero/i })).toBeVisible();
});