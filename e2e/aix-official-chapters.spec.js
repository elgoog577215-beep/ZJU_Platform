import { test, expect } from "@playwright/test";
import fs from "node:fs";
const template = JSON.parse(
    fs.readFileSync(new URL("../shared/hackathonAiX.json", import.meta.url), "utf8")
);
test("four persistent tabs, seven scrollable chapters and pending results change with event state", async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.setFixedTime(new Date("2026-10-10T12:00:00+08:00"));
    await page.addInitScript(() => {
        localStorage.setItem("i18nextLng", "zh");
        localStorage.setItem("ui_mode_v3", "dark");
    });
    await page.route("**/api/hackathon/schedule", (r) =>
        r.fulfill({ json: { events: [template], activeEventKey: template.event.key } })
    );
    await page.goto("/hackathon/2");
    await expect(page.locator(".hx-nav a")).toHaveCount(4);
    await expect(page.locator(".aix-chapters button")).toHaveCount(7);
    await expect(page.locator(".hx-nav a").nth(1)).toContainText("即将揭晓");
    await page.locator(".aix-chapters button").nth(3).click();
    await expect(page.locator(".aix-chapters button").nth(3)).toHaveAttribute(
        "aria-current",
        "location"
    );
    await expect(page.getByText("18 个获奖名额")).toBeVisible();
    await page.locator(".aix-chapters button").nth(0).click();
    await expect(page.locator(".aix-chapters button").nth(0)).toHaveAttribute(
        "aria-current",
        "location"
    );
    await page.locator(".hx-nav a").nth(3).click();
    await expect(page).toHaveURL(/\/hackathon\/2\/results$/);
    await expect(page.locator(".aix-pending-page h1")).toHaveText("赛后公布");
    await page.clock.setFixedTime(new Date("2026-10-26T12:00:00+08:00"));
    await page.reload();
    await expect(page.locator(".aix-pending-page h1")).toHaveText("成果待公布");
    await page.locator(".hx-nav a").nth(2).click();
    await expect(page).toHaveURL(/\/hackathon\/2\/media$/);
    await expect(page.locator(".hx-nav a")).toHaveCount(4);
});
