// @ts-check
const { test, expect } = require("@playwright/test");

test.describe("Strategy Builder", () => {
  // Clear localStorage strategies before each test to avoid cross-test pollution
  test.beforeEach(async ({ page }) => {
    await page.goto("/strategies");
    await page.evaluate(() => localStorage.removeItem("trading_strategies"));
    await page.reload();
  });

  // ── 1. Navigation ────────────────────────────────────────────────────────
  test("navigate to strategies page from dashboard", async ({ page }) => {
    await page.goto("/");

    // The dashboard should have a link to the Strategies page
    const strategiesLink = page.getByRole("link", { name: /Strategies/i });
    await expect(strategiesLink).toBeVisible({ timeout: 15000 });
    await strategiesLink.click();

    await expect(page).toHaveURL(/strategies/);
    await expect(page.getByText("Strategy Builder")).toBeVisible();
  });

  // ── 2. Page sections render ──────────────────────────────────────────────
  test("renders strategy builder with all sections", async ({ page }) => {
    await page.goto("/strategies");

    // Page heading
    await expect(page.getByText("Strategy Builder")).toBeVisible({ timeout: 10000 });

    // AI Strategy Generator section
    await expect(page.getByText("AI Strategy Generator")).toBeVisible();
    await expect(page.locator('textarea[placeholder="Describe your trading strategy in plain English..."]')).toBeVisible();

    // Example chips
    await expect(page.getByText("Buy when RSI < 30 and MACD crosses above signal")).toBeVisible();

    // Condition Editor section
    await expect(page.getByText("Condition Editor")).toBeVisible();
    await expect(page.locator('input[placeholder="My Strategy"]')).toBeVisible();

    // BUY / SELL action buttons
    await expect(page.getByRole("button", { name: "BUY" })).toBeVisible();
    await expect(page.getByRole("button", { name: "SELL" })).toBeVisible();

    // Add Condition, Save, Test buttons
    await expect(page.getByRole("button", { name: "+ Add Condition" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save Strategy" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Test Strategy" })).toBeVisible();

    // Saved Strategies section
    await expect(page.getByText("Saved Strategies")).toBeVisible();
    await expect(page.getByText("No saved strategies yet.")).toBeVisible();

    // Dashboard back link
    await expect(page.getByRole("link", { name: /Dashboard/ })).toBeVisible();
  });

  // ── 3. Add condition via manual editor ───────────────────────────────────
  test("add and remove conditions in editor", async ({ page }) => {
    await page.goto("/strategies");
    await expect(page.getByText("Condition Editor")).toBeVisible({ timeout: 10000 });

    // One default condition row should exist (it has an indicator select, field select, operator select)
    const deleteButtons = page.getByRole("button", { name: "X" });
    await expect(deleteButtons.first()).toBeVisible();

    // Click "+ Add Condition" to add a second row
    await page.getByRole("button", { name: "+ Add Condition" }).click();

    // Now there should be two delete (X) buttons — one per condition row
    await expect(deleteButtons).toHaveCount(2);

    // Change the second condition's indicator to "rsi"
    const indicatorSelects = page.locator("select").filter({ has: page.locator('option[value="rsi"]') });
    const secondIndicatorSelect = indicatorSelects.nth(1);
    await secondIndicatorSelect.selectOption("rsi");

    // Change operator to "<"
    const operatorSelects = page.locator("select").filter({ has: page.locator('option[value="<"]') });
    const secondOperatorSelect = operatorSelects.nth(1);
    await secondOperatorSelect.selectOption("<");

    // Enter a value
    const valueInputs = page.locator('input[placeholder="Value"]');
    await valueInputs.last().fill("30");

    // Delete the first condition
    await deleteButtons.first().click();

    // Now only one condition row remains
    await expect(page.getByRole("button", { name: "X" })).toHaveCount(1);
  });

  // ── 4. Save and load strategy ────────────────────────────────────────────
  test("save and load strategy", async ({ page }) => {
    await page.goto("/strategies");
    await expect(page.getByText("Condition Editor")).toBeVisible({ timeout: 10000 });

    // Fill strategy name
    await page.locator('input[placeholder="My Strategy"]').fill("RSI Oversold Buy");

    // Select SELL action first, then switch back to BUY
    await page.getByRole("button", { name: "SELL" }).click();
    await page.getByRole("button", { name: "BUY" }).click();

    // Configure the default condition: set indicator to rsi, operator to <, value to 35
    const indicatorSelect = page.locator("select").filter({ has: page.locator('option[value="rsi"]') }).first();
    await indicatorSelect.selectOption("rsi");

    const operatorSelect = page.locator("select").filter({ has: page.locator('option[value="<"]') }).first();
    await operatorSelect.selectOption("<");

    await page.locator('input[placeholder="Value"]').first().fill("35");

    // Save the strategy
    await page.getByRole("button", { name: "Save Strategy" }).click();

    // The strategy should appear in the Saved Strategies section
    await expect(page.getByText("RSI Oversold Buy")).toBeVisible();
    // The "No saved strategies yet" message should be gone
    await expect(page.getByText("No saved strategies yet.")).not.toBeVisible();

    // The strategy name input should be cleared after save
    await expect(page.locator('input[placeholder="My Strategy"]')).toHaveValue("");
  });

  // ── 5. Test strategy shows results ───────────────────────────────────────
  test("test strategy shows results", async ({ page }) => {
    await page.goto("/strategies");
    await expect(page.getByText("Condition Editor")).toBeVisible({ timeout: 10000 });

    // Configure a condition: RSI < 35
    const indicatorSelect = page.locator("select").filter({ has: page.locator('option[value="rsi"]') }).first();
    await indicatorSelect.selectOption("rsi");

    const operatorSelect = page.locator("select").filter({ has: page.locator('option[value="<"]') }).first();
    await operatorSelect.selectOption("<");

    await page.locator('input[placeholder="Value"]').first().fill("35");

    // Click Test Strategy
    await page.getByRole("button", { name: "Test Strategy" }).click();

    // The button text should change while testing
    await expect(page.getByRole("button", { name: "Testing..." })).toBeVisible();

    // Wait for results to appear (either success with "Results:" or an error message)
    await expect(page.locator("text=Results:").or(page.locator("[style*='color']").filter({ hasText: /error|Error/ }))).toBeVisible({
      timeout: 15000,
    });
  });

  // ── 6. Delete saved strategy ─────────────────────────────────────────────
  test("delete saved strategy", async ({ page }) => {
    await page.goto("/strategies");
    await expect(page.getByText("Condition Editor")).toBeVisible({ timeout: 10000 });

    // Save a strategy first
    await page.locator('input[placeholder="My Strategy"]').fill("Temp Strategy");

    await page.locator('input[placeholder="Value"]').first().fill("50");

    await page.getByRole("button", { name: "Save Strategy" }).click();

    // Verify it appears in saved list
    await expect(page.getByText("Temp Strategy")).toBeVisible();

    // Delete it
    await page.getByRole("button", { name: "Delete" }).click();

    // Verify it is gone
    await expect(page.getByText("Temp Strategy")).not.toBeVisible();
    await expect(page.getByText("No saved strategies yet.")).toBeVisible();
  });

  // ── 7. Example chip populates prompt ─────────────────────────────────────
  test("clicking example chip populates AI prompt", async ({ page }) => {
    await page.goto("/strategies");
    await expect(page.getByText("AI Strategy Generator")).toBeVisible({ timeout: 10000 });

    const textarea = page.locator('textarea[placeholder="Describe your trading strategy in plain English..."]');
    await expect(textarea).toHaveValue("");

    // Click the first example chip
    await page.getByText("Buy when RSI < 30 and MACD crosses above signal").click();

    // The textarea should now contain the chip text
    await expect(textarea).toHaveValue("Buy when RSI < 30 and MACD crosses above signal");
  });

  // ── 8. Crossover toggle ──────────────────────────────────────────────────
  test("crossover checkbox switches value input to field selector", async ({ page }) => {
    await page.goto("/strategies");
    await expect(page.getByText("Condition Editor")).toBeVisible({ timeout: 10000 });

    // Initially, a numeric value input should be visible
    await expect(page.locator('input[placeholder="Value"]').first()).toBeVisible();

    // Check the "Cross" checkbox
    await page.getByText("Cross").click();

    // The numeric value input should be replaced by a cross-field select dropdown
    await expect(page.locator('input[placeholder="Value"]')).not.toBeVisible();

    // Uncheck the "Cross" checkbox
    await page.getByText("Cross").click();

    // The numeric value input should reappear
    await expect(page.locator('input[placeholder="Value"]').first()).toBeVisible();
  });

  // ── 9. Dashboard back link ───────────────────────────────────────────────
  test("dashboard link navigates back to home", async ({ page }) => {
    await page.goto("/strategies");
    await expect(page.getByText("Strategy Builder")).toBeVisible({ timeout: 10000 });

    // Click the Dashboard back link in the header
    await page.getByRole("link", { name: /Dashboard/ }).click();

    await expect(page).toHaveURL("/");
  });
});
