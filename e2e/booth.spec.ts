import { expect, test, type Page } from "@playwright/test";

/** Unlocks the booth with a 1-second countdown so the tests don't wait 10 seconds per photo. */
async function openBooth(page: Page, settings: Record<string, unknown> = {}) {
  // Seed the settings once per test; later reloads must keep whatever the page saved.
  await page.addInitScript((s) => {
    if (sessionStorage.getItem("seeded")) return;
    localStorage.setItem("studio-booth-settings", JSON.stringify({ countdown: 1, ...s }));
    sessionStorage.setItem("seeded", "1");
  }, settings);
  await page.goto("/");
  await page.getByLabel("Booth PIN").fill("2468");
  await page.getByRole("button", { name: "Unlock" }).click();
  await expect(page.getByRole("heading", { name: "Choose your look" })).toBeVisible();
}

const takePhoto = async (page: Page) => {
  const button = page.getByRole("button", { name: /TAKE MY PHOTO/ });
  await expect(button).toBeEnabled();
  await button.click();
  const result = page.getByTestId("result");
  await expect(result).toBeVisible();
  return (await result.getAttribute("data-download-url"))!;
};

test("a guest takes a Magazine photo and downloads it", async ({ page, context }) => {
  await openBooth(page);
  await page.getByRole("button", { name: /Magazine/ }).click();
  await page.getByRole("button", { name: "Black backdrop" }).click();
  await page.getByRole("button", { name: "Full body" }).click();
  await expect(page.getByText("1-second timer")).toBeVisible();

  const downloadUrl = await takePhoto(page);
  await expect(page.getByRole("heading", { name: /Your portrait\s*is ready/ })).toBeVisible();
  await expect(page.getByRole("img", { name: "QR code to download your photo" }).locator("svg")).toBeVisible();
  expect(downloadUrl).toMatch(/^http:\/\/localhost:3200\/p\/[A-Za-z0-9_-]{22}$/);

  // The guest's phone opens the QR link.
  const phone = await context.newPage();
  await phone.goto(downloadUrl);
  const photo = phone.getByRole("img", { name: "Your studio portrait" });
  await expect(photo).toBeVisible();
  await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await expect(phone.getByRole("button", { name: "Save photo" })).toBeVisible();
  await expect(phone.getByText("Your photo is edited by an AI service and deleted within 1 hour.")).toBeVisible();

  // Retake: a new photo, and the old link no longer works.
  await page.getByRole("button", { name: "Retake" }).click();
  await expect(page.getByTestId("result")).toBeVisible();
  await expect.poll(() => page.getByTestId("result").getAttribute("data-download-url")).not.toBe(downloadUrl);
  await phone.goto(downloadUrl);
  await expect(phone.getByRole("heading", { name: "This photo has been deleted" })).toBeVisible();

  // Done goes back to the start.
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByRole("heading", { name: "Choose your look" })).toBeVisible();
});

test("Kawaii hides the backdrop swatches", async ({ page }) => {
  await openBooth(page);
  await page.getByRole("button", { name: /Kawaii/ }).click();
  await expect(page.getByText("Pastel backdrop")).toBeVisible();
  await expect(page.getByRole("button", { name: "Black backdrop" })).toHaveCount(0);
  await page.getByRole("button", { name: /Film/ }).click();
  await expect(page.getByRole("button", { name: "Black backdrop" })).toBeVisible();
});

test("camera failure", async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException("denied", "NotAllowedError"));
  });
  await openBooth(page);
  await expect(page.getByText("Camera unavailable — tap to retry")).toBeVisible();
  await expect(page.getByRole("button", { name: /TAKE MY PHOTO/ })).toBeDisabled();
});

test("only enabled styles are offered", async ({ page }) => {
  await openBooth(page, { enabledStyles: ["bw", "polaroid"] });
  await expect(page.getByRole("button", { name: /Black and White/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Polaroid/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Magazine/ })).toHaveCount(0);
});

test("setup lists the fake camera", async ({ page }) => {
  await openBooth(page);
  await page.goto("/setup");
  await expect(page.getByRole("heading", { name: "Booth setup" })).toBeVisible();
  await expect(page.getByTestId("camera-info")).toHaveText(/\d+ × \d+/);
  await expect.poll(() => page.getByLabel("Camera", { exact: true }).locator("option").count()).toBeGreaterThanOrEqual(2);
  await page.getByLabel("Event name").fill("Open House 2026");
  await page.reload();
  await expect(page.getByLabel("Event name")).toHaveValue("Open House 2026");
});

test("the booth needs the PIN", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Booth PIN").fill("1111");
  await page.getByRole("button", { name: "Unlock" }).click();
  await expect(page.getByText("That PIN isn't right.")).toBeVisible();
  const res = await page.request.post("/api/shots", { multipart: { style: "bw", backdrop: "grey", framing: "full" } });
  expect(res.status()).toBe(401);
});
