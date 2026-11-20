import { test, expect } from "@playwright/test";

test("category landing page renders its sample question and reveals the explanation on selection", async ({
  page,
}) => {
  await page.goto("/logical-reasoning-test");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("Nia's lamp", { exact: false }).first()).toBeVisible();

  await page.getByRole("button", { name: "On the workbench" }).click();
  await expect(page.getByText("By elimination", { exact: false })).toBeVisible();
});

test("primary-intent pages are reachable", async ({ page }) => {
  await page.goto("/free-iq-test");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.goto("/online-iq-test");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.goto("/how-iq-is-calculated");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("blog index links into a real article", async ({ page }) => {
  await page.goto("/blog");
  await expect(page.getByRole("heading", { level: 1, name: "Blog" })).toBeVisible();

  await page.getByRole("link", { name: /Number Sequence Puzzles/i }).click();
  await expect(page.getByRole("heading", { level: 1, name: /Number Sequence Puzzles/i })).toBeVisible();
  await expect(page.getByText("By The Cognitive Assessment Platform Team", { exact: false })).toBeVisible();
});

test("an unknown public share slug renders the custom 404 page", async ({ page }) => {
  const response = await page.goto("/u/this-slug-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("sitemap includes the new SEO pages", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  const body = await response.text();
  expect(body).toContain("/logical-reasoning-test");
  expect(body).toContain("/blog/what-is-iq");
  expect(body).not.toContain("/u/");
});
