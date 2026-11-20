import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("protected pages redirect to sign-in", async ({ page }) => {
  await page.goto("/s/nakhla/orders");
  await expect(page).toHaveURL(/\/login\?next=%2Fs%2Fnakhla%2Forders/);
});

test("rejects a wrong password with a generic message", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("sara@sahm.app");
  await page.getByLabel("Password").fill("nope");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator("#login-error")).toHaveText("Email or password is incorrect.", {
    timeout: 15_000,
  });
});

test("owner sees the streamed overview and can switch stores", async ({ page }) => {
  await signIn(page, "sara@sahm.app");
  await expect(page.getByRole("heading", { name: "Good to see you, Sara" })).toBeVisible();
  await expect(page.getByText("Net revenue", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Top products" })).toBeVisible();

  await page.getByRole("link", { name: "90 days" }).click();
  await expect(page).toHaveURL(/range=90/);
  await expect(page.getByText("vs prior 90 days").first()).toBeVisible();

  await page.getByRole("button", { name: /Nakhla Coffee Roasters/ }).click();
  await page.getByRole("option", { name: /Ward Flowers/ }).click();
  await expect(page).toHaveURL(/\/s\/ward$/);
  await expect(page.getByText("Ward Flowers · Flowers & gifts")).toBeVisible();
});

test("a viewer is read-only and cannot open other tenants", async ({ page }) => {
  await signIn(page, "lina@sahm.app");
  await page.getByRole("link", { name: "Orders" }).first().click();
  await expect(page.getByText("You have read-only access")).toBeVisible();
  await expect(page.getByRole("combobox", { name: /Change status/ })).toHaveCount(0);

  const response = await page.goto("/s/souq-tech");
  expect(response?.status()).toBe(404);
  await expect(page.getByText("We couldn't find that page")).toBeVisible();
});

test("a manager updates an order status optimistically and it persists", async ({ page }) => {
  await signIn(page, "omar@sahm.app");
  await page.goto("/s/nakhla/orders");
  await page.getByRole("button", { name: /^pending/ }).click();

  const firstRow = page.locator("[data-testid^='order-']").first();
  const number = (await firstRow.getAttribute("data-testid"))!.replace("order-", "");
  await firstRow.getByRole("combobox").selectOption("paid");
  await expect(page.getByRole("status").filter({ hasText: `${number} marked paid` })).toBeVisible();

  await page.reload();
  await page.getByRole("searchbox", { name: "Search orders" }).fill(number);
  await expect(
    page.getByTestId(`order-${number}`).getByText("paid", { exact: true }),
  ).toBeVisible();
});

test("a manager restocks a product", async ({ page }) => {
  await signIn(page, "omar@sahm.app");
  await page.goto("/s/nakhla/inventory");
  const row = page.getByTestId("product-NK-101");
  const before = Number(await row.getByTestId("stock").textContent());
  await row.getByRole("button", { name: "Restock +24" }).click();
  await expect(row.getByTestId("stock")).toHaveText(String(before + 24));
  await page.reload();
  await expect(page.getByTestId("product-NK-101").getByTestId("stock")).toHaveText(
    String(before + 24),
  );
});

test("exports the filtered orders as CSV", async ({ page }) => {
  await signIn(page, "sara@sahm.app");
  await page.goto("/s/nakhla/orders");
  await page.getByRole("button", { name: /^refunded/ }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("nakhla-orders.csv");
  const text = await (
    await file.createReadStream()
  )
    .toArray()
    .then((c) => Buffer.concat(c).toString("utf8"));
  const lines = text.trim().split("\r\n");
  expect(lines[0]).toContain("Order,Placed (ISO),Customer");
  expect(lines.slice(1).every((l) => l.endsWith(",refunded"))).toBe(true);
});

test("only owners can change roles", async ({ page }) => {
  await signIn(page, "omar@sahm.app");
  await page.goto("/s/nakhla/team");
  await expect(page.getByText("Only owners can change roles.")).toBeVisible();
  await expect(page.getByRole("combobox")).toHaveCount(0);
});
