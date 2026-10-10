import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
export const AIX_CHAPTER_IDS = [
    "aix-overview",
    "aix-tracks",
    "aix-forums",
    "aix-rewards",
    "aix-partners-title",
    "aix-recap",
    "registration-form",
];
export default function AiXChapters({ containerRef, onSelect }) {
    const { t } = useTranslation();
    const [active, setActive] = useState(0);
    const navRef = useRef(null);
    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
                if (visible.length) setActive(AIX_CHAPTER_IDS.indexOf(visible[0].target.id));
            },
            { root, rootMargin: "-12% 0px -65% 0px", threshold: 0 }
        );
        AIX_CHAPTER_IDS.forEach((id) => {
            const element = root.querySelector(`#${id}`);
            if (element) observer.observe(element);
        });
        return () => observer.disconnect();
    }, [containerRef]);
    useEffect(() => {
        const nav = navRef.current,
            button = nav?.children[active];
        if (button)
            nav.scrollTo({
                left: Math.max(0, button.offsetLeft - nav.clientWidth / 2 + button.clientWidth / 2),
                behavior: "instant",
            });
    }, [active]);
    return (
        <nav ref={navRef} className="aix-chapters" aria-label={t("aix.official.chapterNav")}>
            {t("aix.official.chapters", { returnObjects: true }).map((label, index) => (
                <button
                    key={AIX_CHAPTER_IDS[index]}
                    type="button"
                    aria-current={active === index ? "location" : undefined}
                    onClick={() => onSelect(AIX_CHAPTER_IDS[index])}
                >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    {label}
                </button>
            ))}
        </nav>
    );
}
