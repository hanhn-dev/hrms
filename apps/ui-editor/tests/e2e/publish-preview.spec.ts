import { expect, test } from "playwright/test";

test("publishes a draft and opens the preview route", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("tab", { name: /html snapshot/i }).click();
  await page.getByLabel(/source label/i).fill("Publish flow");
  await page.getByLabel(/original url/i).fill("https://example.com/publish");
  await page.getByLabel(/html markup/i).fill("<main><h1>Publish flow</h1><p>Prototype preview</p></main>");
  await page.getByRole("button", { name: /create draft from html/i }).click();

  await page.getByRole("button", { name: /publish prototype/i }).click();

  await expect(page).toHaveURL(/\/preview$/i);
  await expect(page.getByRole("heading", { name: /publish flow/i })).toBeVisible();
});