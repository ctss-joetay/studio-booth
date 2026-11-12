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

/** Setup always asks for the PIN, even on an unlocked booth iPad. */
async function openSetup(page: Page) {
  await page.goto("/setup");
  await page.getByLabel("Booth PIN").fill("2468");
  await page.getByRole("button", { name: "Unlock" }).click();
  await expect(page.getByRole("heading", { name: "Booth setup" })).toBeVisible();
}

test("setup lists the fake camera", async ({ page }) => {
  await openBooth(page);
  await openSetup(page);
  await expect(page.getByTestId("camera-info")).toHaveText(/\d+ × \d+/);
  await expect.poll(() => page.getByLabel("Camera", { exact: true }).locator("option").count()).toBeGreaterThanOrEqual(2);
});

test("guests can't open Setup on the booth without the PIN", async ({ page }) => {
  await openBooth(page);
  await page.goto("/setup");
  await expect(page.getByLabel("Booth PIN")).toBeVisible();
  await expect(page.getByLabel("Event name")).toHaveCount(0);
});

test("helpers can type the event name and the countdown key by key", async ({ page }) => {
  await openBooth(page);
  await openSetup(page);
  const name = page.getByLabel("Event name");
  await name.click();
  await name.pressSequentially("Open House 2026");
  const seconds = page.getByLabel("Countdown seconds");
  await seconds.selectText();
  await page.keyboard.press("Backspace");
  await seconds.pressSequentially("5");
  await page.keyboard.press("Tab");
  await expect(name).toHaveValue("Open House 2026");
  await expect(seconds).toHaveValue("5");
  await page.goto("/");
  await expect(page.getByText("5-second timer")).toBeVisible();
});

test("Try again never sends an earlier guest's photo", async ({ page }) => {
  let uploads = 0;
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().endsWith("/api/shots")) uploads++;
  });
  await openBooth(page);
  await takePhoto(page);
  await page.getByRole("button", { name: "Done" }).click();
  // The next group's capture fails.
  await page.evaluate(() => {
    HTMLCanvasElement.prototype.toBlob = function (callback: BlobCallback) {
      callback(null);
    };
  });
  await page.getByRole("button", { name: /TAKE MY PHOTO/ }).click();
  await expect(page.getByText("The camera couldn't take the photo. Try again.")).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { name: "Choose your look" })).toBeVisible();
  expect(uploads).toBe(1);
});

test("the error screen goes back to the start after two idle minutes", async ({ page }) => {
  await page.clock.install();
  await page.route("**/api/shots", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "The AI took too long. Try again." }) }),
  );
  await openBooth(page);
  await expect(page.getByRole("button", { name: /TAKE MY PHOTO/ })).toBeEnabled();
  await page.getByRole("button", { name: /TAKE MY PHOTO/ }).click();
  await page.clock.runFor(1500);
  await expect(page.getByText("That one didn't develop")).toBeVisible();
  await page.clock.runFor(121_000);
  await expect(page.getByRole("heading", { name: "Choose your look" })).toBeVisible();
});

test("a camera unplugged mid-session is noticed", async ({ page }) => {
  await openBooth(page);
  await expect(page.getByRole("button", { name: /TAKE MY PHOTO/ })).toBeEnabled();
  await page.evaluate(() => {
    const track = (document.querySelector("video")!.srcObject as MediaStream).getVideoTracks()[0];
    track.stop();
    track.dispatchEvent(new Event("ended"));
  });
  await expect(page.getByText("Camera unavailable — tap to retry")).toBeVisible();
  await expect(page.getByRole("button", { name: /TAKE MY PHOTO/ })).toBeDisabled();
});

test("Save photo tells the guest when the photo is gone", async ({ page, context }) => {
  await openBooth(page);
  const url = await takePhoto(page);
  const phone = await context.newPage();
  await phone.route("**/api/p/**", (route) =>
    route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "This photo has been deleted" }) }),
  );
  await phone.goto(url);
  await phone.getByRole("button", { name: "Save photo" }).click();
  await expect(phone.getByText("This photo has been deleted")).toBeVisible();
});

test("the booth needs the PIN", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Booth PIN").fill("1111");
  await page.getByRole("button", { name: "Unlock" }).click();
  await expect(page.getByText("That PIN isn't right.")).toBeVisible();
  const res = await page.request.post("/api/shots", { multipart: { style: "bw", backdrop: "grey", framing: "full" } });
  expect(res.status()).toBe(401);
});

const frameRatio = async (page: Page) => {
  const box = (await page.getByTestId("camera-frame").boundingBox())!;
  return box.width / box.height;
};

test("photos come out in the shape chosen in Setup, whatever shape the camera sends", async ({ page }) => {
  // Chrome's fake camera sends landscape pictures; the booth is set to portrait.
  await openBooth(page, { shape: "portrait" });
  await expect.poll(() => frameRatio(page)).toBeCloseTo(2 / 3, 2);

  await takePhoto(page);
  const photo = page.getByRole("img", { name: "Your portrait" });
  await expect.poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  const size = await photo.evaluate((img: HTMLImageElement) => ({ w: img.naturalWidth, h: img.naturalHeight }));
  expect(size.w / size.h).toBeCloseTo(2 / 3, 1);
});

test("the booth takes landscape photos unless Setup says otherwise", async ({ page }) => {
  await openBooth(page);
  await expect.poll(() => frameRatio(page)).toBeCloseTo(3 / 2, 2);
});

test("Setup warns when the camera's picture is the other way round from the photo shape", async ({ page }) => {
  await openBooth(page);
  await openSetup(page);
  const shape = page.getByLabel("Photo shape");
  await expect(shape).toHaveValue("landscape");
  await expect(page.getByTestId("camera-info")).toHaveText(/\d+ × \d+/);
  await expect(page.getByTestId("shape-warning")).toHaveCount(0);

  await shape.selectOption("portrait");
  await expect(page.getByTestId("shape-warning")).toHaveText(/sending landscape pictures/);
  await expect.poll(() => frameRatio(page)).toBeCloseTo(2 / 3, 2);

  await page.goto("/");
  await expect.poll(() => frameRatio(page)).toBeCloseTo(2 / 3, 2);
});
