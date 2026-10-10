import { useEffect, useId, useRef, useState } from "react";
import { List } from "lucide-react";
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
    const [expanded, setExpanded] = useState(false);
    const toggleRef = useRef(null);
    const menuId = useId();
    const labels = t("aix.official.chapters", { returnObjects: true });
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
        if (!expanded) return;
        const closeOnEscape = (event) => {
            if (event.key === "Escape") {
                setExpanded(false);
                toggleRef.current?.focus();
            }
        };
        document.addEventListener("keydown", closeOnEscape);
        return () => document.removeEventListener("keydown", closeOnEscape);
    }, [expanded]);
    const selectChapter = (id) => {
        onSelect(id);
        setExpanded(false);
        if (window.matchMedia("(max-width: 767px)").matches) toggleRef.current?.focus();
    };
    return (
        <div className="aix-chapter-controls" data-expanded={expanded}>
            <button
                ref={toggleRef}
                type="button"
                className="aix-chapters-toggle"
                aria-label={t("aix.official.chapterNav")}
                aria-expanded={expanded}
                aria-controls={menuId}
                onClick={() => setExpanded((value) => !value)}
            >
                <List size={18} aria-hidden="true" />
                <span>{String(active + 1).padStart(2, "0")}</span>
            </button>
            <nav id={menuId} className="aix-chapters" aria-label={t("aix.official.chapterNav")}>
                {labels.map((label, index) => (
                    <button
                        key={AIX_CHAPTER_IDS[index]}
                        type="button"
                        aria-current={active === index ? "location" : undefined}
                        onClick={() => selectChapter(AIX_CHAPTER_IDS[index])}
                    >
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        {label}
                    </button>
                ))}
            </nav>
        </div>
    );
}
