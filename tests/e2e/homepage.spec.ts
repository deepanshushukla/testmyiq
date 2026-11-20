import { test, expect } from "@playwright/test";

test("homepage renders the real landing content", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "How sharp is your reasoning, really?" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Start your assessment" })).toBeVisible();
});

test("public pages are reachable and link to each other", async ({ page }) => {
  await page.goto("/how-it-works");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.goto("/pricing");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.goto("/faq");
  await expect(page.getByRole("heading", { level: 1, name: "Frequently asked questions" })).toBeVisible();
});

test("sitemap and robots.txt are served", async ({ request }) => {
  const sitemapResponse = await request.get("/sitemap.xml");
  expect(sitemapResponse.status()).toBe(200);
  const sitemapBody = await sitemapResponse.text();
  expect(sitemapBody).toContain("/how-it-works");
  expect(sitemapBody).not.toContain("/dashboard");

  const robotsResponse = await request.get("/robots.txt");
  expect(robotsResponse.status()).toBe(200);
  const robotsBody = await robotsResponse.text();
  expect(robotsBody).toContain("Disallow: /dashboard");
});

test("unknown routes render the custom 404 page", async ({ page }) => {
  const response = await page.goto("/this-route-does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});
