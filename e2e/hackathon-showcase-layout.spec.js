import { expect, test } from "@playwright/test";

const prepareDesktopPerformance = async (page) => {
    await page.addInitScript(() => {
        Object.defineProperty(navigator, "hardwareConcurrency", {
            configurable: true,
            get: () => 8,
        });
        Object.defineProperty(navigator, "deviceMemory", {
            configurable: true,
            get: () => 8,
        });
    });
};

test("hackathon showcase keeps one desktop command row and a balanced hero", async ({ page }) => {
    await prepareDesktopPerformance(page);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/hackathon?event=zhekesong-current&view=showcase");

    const timeline = page.locator("[data-hackathon-schedule-panel]");
    const pageTabs = page.getByRole("tablist", { name: /页面切换/ });
    const heroCopy = page.locator(".showcase-hero-copy");
    const film = page.locator(".showcase-film-card");

    await expect(timeline).toBeVisible();
    await expect(pageTabs).toBeVisible();
    await expect(heroCopy).toBeVisible();
    await expect(film).toBeVisible();

    const [timelineBox, pageTabsBox, heroBox, filmBox] = await Promise.all([
        timeline.boundingBox(),
        pageTabs.boundingBox(),
        heroCopy.boundingBox(),
        film.boundingBox(),
    ]);

    expect(timelineBox).not.toBeNull();
    expect(pageTabsBox).not.toBeNull();
    expect(heroBox).not.toBeNull();
    expect(filmBox).not.toBeNull();
    expect(Math.abs(timelineBox.y - pageTabsBox.y)).toBeLessThanOrEqual(4);
    expect(pageTabsBox.x).toBeGreaterThan(timelineBox.x);
    expect(Math.abs(heroBox.y - filmBox.y)).toBeLessThanOrEqual(48);
    expect(filmBox.height).toBeLessThan(700);

    const titleFontSize = Number.parseFloat(
        await page.locator("[data-showcase-title]").evaluate((element) => {
            return window.getComputedStyle(element).fontSize;
        })
    );
    expect(titleFontSize).toBeLessThanOrEqual(96);
    await expect(page.locator('nav[aria-label="比赛成果展览章节"]')).toHaveCount(0);

    const showcaseLayout = await page.locator("[data-showcase-page]").evaluate((element) => {
        const ids = ["gate", "gallery", "archive", "works", "index", "partners"];
        return {
            clientHeight: element.clientHeight,
            scrollHeight: element.scrollHeight,
            sections: ids.map((id) => {
                const section = document.getElementById(id);
                return {
                    id,
                    offsetTop: section?.offsetTop ?? -1,
                    height: section?.getBoundingClientRect().height ?? 0,
                };
            }),
        };
    });

    expect(showcaseLayout.sections.map((section) => section.id)).toEqual([
        "gate",
        "gallery",
        "archive",
        "works",
        "index",
        "partners",
    ]);
    expect(showcaseLayout.scrollHeight).toBeGreaterThanOrEqual(showcaseLayout.clientHeight * 5.8);
    showcaseLayout.sections.forEach((section, index) => {
        expect(section.height).toBeGreaterThanOrEqual(showcaseLayout.clientHeight * 0.95);
        if (index > 0) {
            expect(section.offsetTop).toBeGreaterThan(
                showcaseLayout.sections[index - 1].offsetTop + showcaseLayout.clientHeight * 0.9
            );
        }
    });
});

test("hackathon showcase preserves the mobile reading order and clears page tabs on scroll", async ({
    page,
}) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/hackathon?event=zhekesong-current&view=showcase");

    const timeline = page.locator("[data-hackathon-schedule-panel]");
    const pageTabs = page.getByRole("tablist", { name: /页面切换/ });
    const title = page.locator("[data-showcase-title]");
    const film = page.locator(".showcase-film-card");

    await expect(timeline).toBeVisible();
    await expect(pageTabs).toBeVisible();
    await expect(title).toBeVisible();
    await expect(film).toBeVisible();

    const [pageTabsBox, titleBox, filmBox] = await Promise.all([
        pageTabs.boundingBox(),
        title.boundingBox(),
        film.boundingBox(),
    ]);
    expect(pageTabsBox).not.toBeNull();
    expect(titleBox).not.toBeNull();
    expect(filmBox).not.toBeNull();
    expect(pageTabsBox.y).toBeLessThan(titleBox.y);
    expect(titleBox.y).toBeLessThan(filmBox.y);

    const mobileSectionOrder = await page.locator("[data-showcase-page]").evaluate(() => {
        return ["gate", "gallery", "archive", "works", "index", "partners"].map((id) => {
            const section = document.getElementById(id);
            return { id, offsetTop: section?.offsetTop ?? -1 };
        });
    });
    mobileSectionOrder.forEach((section, index) => {
        expect(section.offsetTop).toBeGreaterThanOrEqual(0);
        if (index > 0) {
            expect(section.offsetTop).toBeGreaterThan(mobileSectionOrder[index - 1].offsetTop);
        }
    });

    await page.evaluate(() => window.scrollTo(0, 1000));
    await expect(pageTabs).toHaveCount(0);
    await expect(timeline).toBeVisible();
});
