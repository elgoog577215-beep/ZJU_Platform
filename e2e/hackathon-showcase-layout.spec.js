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
    await expect(page.locator("#gallery")).toHaveCount(0);
    await expect(page.locator("#archive .showcase-image-card")).toHaveCount(5);
    await expect(page.locator("#archive .showcase-media-overlay")).toHaveCount(0);

    const worksBoardBorderWidth = await page
        .locator("#works .showcase-works-board")
        .evaluate((element) => window.getComputedStyle(element).borderTopWidth);
    expect(worksBoardBorderWidth).toBe("0px");

    const workPhotoPseudoContent = await page
        .locator("#works .showcase-work-cover")
        .first()
        .evaluate((element) => window.getComputedStyle(element, "::after").content);
    expect(["none", "normal", '""']).toContain(workPhotoPseudoContent);

    const showcaseLayout = await page.locator("[data-showcase-page]").evaluate((element) => {
        const ids = ["gate", "archive", "works", "index", "partners"];
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
        "archive",
        "works",
        "index",
        "partners",
    ]);
    expect(showcaseLayout.scrollHeight).toBeGreaterThanOrEqual(showcaseLayout.clientHeight * 4.8);
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
        return ["gate", "archive", "works", "index", "partners"].map((id) => {
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

test("hackathon showcase keeps one continuous mobile scroll surface", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/hackathon?event=zhekesong-current&view=showcase");

    const showcasePage = page.locator("[data-showcase-page]");
    await expect(showcasePage).toBeVisible();

    const initialScrollState = await showcasePage.evaluate((element) => {
        const style = window.getComputedStyle(element);
        const documentElement = document.documentElement;
        return {
            documentHeight: documentElement.scrollHeight,
            horizontalOverflow: documentElement.scrollWidth - documentElement.clientWidth,
            rootClientHeight: element.clientHeight,
            rootScrollHeight: element.scrollHeight,
            rootScrollTop: element.scrollTop,
            overflowY: style.overflowY,
            scrollSnapType: style.scrollSnapType,
            touchAction: style.touchAction,
        };
    });

    expect(initialScrollState.documentHeight).toBeGreaterThan(844);
    expect(initialScrollState.horizontalOverflow).toBeLessThanOrEqual(1);
    expect(initialScrollState.rootClientHeight).toBe(initialScrollState.rootScrollHeight);
    expect(initialScrollState.rootScrollTop).toBe(0);
    expect(initialScrollState.overflowY).toBe("visible");
    expect(initialScrollState.scrollSnapType).toBe("none");
    expect(initialScrollState.touchAction).toContain("pan-y");

    const visitedSections = new Set(["gate"]);
    let previousScrollY = 0;
    let reachedBottom = false;

    for (let step = 0; step < 32; step += 1) {
        await page.mouse.wheel(0, 360);
        await page.waitForTimeout(24);

        const sample = await page.evaluate(() => {
            const documentElement = document.documentElement;
            const viewportCenter = window.innerHeight / 2;
            const currentSection = ["gate", "archive", "works", "index", "partners"]
                .map((id) => document.getElementById(id))
                .filter(Boolean)
                .find((section) => {
                    const rect = section.getBoundingClientRect();
                    return rect.top <= viewportCenter && rect.bottom >= viewportCenter;
                });

            return {
                sectionId: currentSection?.id || null,
                scrollY: window.scrollY,
                maxScrollY: documentElement.scrollHeight - window.innerHeight,
                showcaseScrollTop: document.querySelector("[data-showcase-page]")?.scrollTop || 0,
            };
        });

        expect(sample.scrollY).toBeGreaterThanOrEqual(previousScrollY);
        expect(sample.showcaseScrollTop).toBe(0);
        if (sample.sectionId) visitedSections.add(sample.sectionId);
        previousScrollY = sample.scrollY;

        if (sample.scrollY >= sample.maxScrollY - 2) {
            reachedBottom = true;
            break;
        }
    }

    expect(reachedBottom).toBe(true);
    expect([...visitedSections]).toEqual(["gate", "archive", "works", "index", "partners"]);

    const bottomSafety = await page.evaluate(() => {
        const partners = document.getElementById("partners");
        const lastAction = partners?.querySelector("a:last-of-type, button:last-of-type");
        const fixedBottomNav = [...document.querySelectorAll("nav")].find((element) => {
            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.position === "fixed" && Math.abs(rect.bottom - window.innerHeight) <= 2;
        });

        return {
            actionBottom: lastAction?.getBoundingClientRect().bottom ?? window.innerHeight,
            bottomNavTop: fixedBottomNav?.getBoundingClientRect().top ?? window.innerHeight,
        };
    });

    expect(bottomSafety.actionBottom).toBeLessThan(bottomSafety.bottomNavTop);

    for (let step = 0; step < 32 && previousScrollY > 0; step += 1) {
        await page.mouse.wheel(0, -360);
        await page.waitForTimeout(24);
        const nextScrollY = await page.evaluate(() => window.scrollY);
        expect(nextScrollY).toBeLessThanOrEqual(previousScrollY);
        previousScrollY = nextScrollY;
    }

    expect(previousScrollY).toBe(0);
});
