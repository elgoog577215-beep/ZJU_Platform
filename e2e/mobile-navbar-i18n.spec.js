import { test, expect } from "@playwright/test";

test("mobile English navigation uses short labels without overlap", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
        window.localStorage.setItem("i18nextLng", "en");
    });

    await page.goto("/events");

    const navigation = page.getByRole("navigation", { name: "Mobile bottom navigation" });
    const labels = ["Events", "Learn", "Projects", "Hackathon", "Me"];
    const boxes = [];

    for (const label of labels) {
        const item = navigation.getByText(label, { exact: true });
        await expect(item).toBeVisible();
        boxes.push(await item.boundingBox());
    }

    for (let index = 1; index < boxes.length; index += 1) {
        expect(boxes[index - 1].x + boxes[index - 1].width).toBeLessThanOrEqual(boxes[index].x);
    }
});
