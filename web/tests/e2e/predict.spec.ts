import { expect, test } from "@playwright/test";

test.describe("/predict happy path", () => {
  test("low-risk sample → Existing label + cluster + recommendation", async ({ page }) => {
    await page.goto("/predict");

    // Default form values are SAMPLE_LOW_RISK; just submit.
    await page.getByRole("button", { name: /^Predict$/ }).click();

    // Expect Recommendation card heading + result cards within 10s.
    await expect(page.getByText("Churn probability", { exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/Predicted label:/)).toBeVisible();
    await expect(page.getByText(/Top contributing features/)).toBeVisible();
    await expect(page.getByText(/Recommendation/, { exact: false })).toBeVisible();

    // Severity gauge renders a percentage.
    await expect(page.getByText(/^\d{1,3}%$/).first()).toBeVisible();
  });

  test("high-risk sample → Attrited label", async ({ page }) => {
    await page.goto("/predict");

    await page.getByRole("button", { name: /Load high-risk sample/ }).click();
    await page.getByRole("button", { name: /^Predict$/ }).click();

    await expect(page.getByText("Attrited", { exact: true }).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
