import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, LayoutGrid, Search, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

import { getPartnerLogoSrc } from "../data/partnerLogos";
import { useHorizontalDragScroll } from "../hooks/useHorizontalDragScroll";

const toArray = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
        const text = value.trim();
        if (!text) return [];
        try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) return parsed;
        } catch {
            // Fall through to separator parsing for plain textarea values.
        }
        return text.split(/[\n,]/);
    }
    return [];
};

const uniqueTerms = (items) => {
    const seen = new Set();
    const terms = [];
    for (const item of items) {
        const term = String(item || "").trim();
        if (!term || seen.has(term)) continue;
        seen.add(term);
        terms.push(term);
    }
    return terms;
};

export const getPartnerEventTerms = (partner = {}) =>
    uniqueTerms([...toArray(partner.event_organizer_aliases), partner.name, partner.name_en]).slice(
        0,
        20
    );

export const getLocalizedPartnerName = (partner = {}, language = "zh") => {
    if (String(language || "").startsWith("en") && partner.name_en) {
        return partner.name_en;
    }
    return partner.name || partner.name_en || "";
};

const getPartnerEventCount = (partner = {}) => {
    const count = Number(partner.event_count ?? partner.eventCount ?? 0);
    return Number.isFinite(count) ? count : 0;
};

const PartnerLogo = ({ partner, name, isDayMode }) => {
    const logoSrc = getPartnerLogoSrc(partner, isDayMode);

    if (logoSrc) {
        return (
            <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] px-1.5 ${
                    isDayMode ? "bg-white/75" : "bg-white/85"
                }`}
            >
                <img
                    src={logoSrc}
                    alt={`${name} logo`}
                    className="max-h-[76%] max-w-full object-contain"
                    loading="lazy"
                    decoding="async"
                />
            </span>
        );
    }

    return (
        <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] ${
                isDayMode ? "bg-slate-100 text-slate-500" : "bg-white/[0.07] text-slate-400"
            }`}
        >
            <Users size={17} aria-hidden="true" />
        </span>
    );
};

const OrganizationPartnerWall = ({
    partners = [],
    isDayMode,
    className = "",
    activePartnerId = null,
    onApplyPartnerFilter,
    onClearPartnerFilter,
}) => {
    const { t, i18n } = useTranslation();
    const language = i18n.resolvedLanguage || i18n.language || "zh";
    const { scrollRef, dragScrollProps } = useHorizontalDragScroll();
    const [directoryOpen, setDirectoryOpen] = useState(false);
    const [search, setSearch] = useState("");
    const directoryId = useId();
    const directoryTriggerRef = useRef(null);
    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            const track = scrollRef.current;
            const active = track?.querySelector('[aria-pressed="true"]');
            if (!track || !active || !track.clientWidth) return;
            const trackBounds = track.getBoundingClientRect();
            const activeBounds = active.getBoundingClientRect();
            if (activeBounds.left < trackBounds.left || activeBounds.right > trackBounds.right) {
                track.scrollTo({
                    left:
                        track.scrollLeft +
                        activeBounds.left -
                        trackBounds.left -
                        (trackBounds.width - activeBounds.width) / 2,
                    behavior: "instant",
                });
            }
        });
        return () => cancelAnimationFrame(frame);
    }, [activePartnerId, partners, scrollRef]);

    const buttonPartners = useMemo(
        () =>
            partners
                .filter((partner) => partner?.enabled !== false && partner?.enabled !== 0)
                .map((partner) => ({
                    ...partner,
                    eventCount: getPartnerEventCount(partner),
                    terms: getPartnerEventTerms(partner),
                    displayName: getLocalizedPartnerName(partner, language),
                }))
                .filter((partner) => partner.displayName && partner.terms.length > 0)
                .sort((left, right) => {
                    if (right.eventCount !== left.eventCount) {
                        return right.eventCount - left.eventCount;
                    }
                    const leftOrder = Number(left.sort_order ?? left.sortOrder ?? 0) || 0;
                    const rightOrder = Number(right.sort_order ?? right.sortOrder ?? 0) || 0;
                    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
                    return left.displayName.localeCompare(right.displayName, language);
                }),
        [language, partners]
    );

    if (buttonPartners.length === 0) return null;

    const isAllActive = activePartnerId === null || activePartnerId === undefined;
    const matchingPartners = buttonPartners.filter((partner) =>
        [partner.displayName, ...partner.terms].some((name) =>
            name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
        )
    );
    const closeDirectory = () => {
        setDirectoryOpen(false);
        setSearch("");
        directoryTriggerRef.current?.focus();
    };
    const mutedClass = isDayMode ? "text-slate-500" : "text-slate-400";
    const shellClass = isDayMode
        ? "border-white/55 bg-white/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] backdrop-blur-md"
        : "border-white/[0.09] bg-slate-950/[0.28] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] backdrop-blur-md";
    const buttonBase =
        "relative flex min-h-[72px] shrink-0 snap-start flex-col items-center gap-1 px-1 py-1 text-center transition-[background-color,border-color,color,box-shadow] after:absolute after:bottom-0 after:left-1 after:right-1 after:h-0.5 after:rounded-full after:bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 md:h-14 md:min-h-0 md:flex-row md:gap-2.5 md:rounded-[10px] md:border md:border-transparent md:px-2.5 md:py-2 md:text-left md:after:hidden";
    const getButtonClass = (active) => {
        if (active) {
            return isDayMode
                ? "text-blue-800 after:bg-blue-600 md:border-blue-200/80 md:bg-white/80 md:shadow-[0_8px_22px_rgba(37,99,235,0.08)]"
                : "text-white after:bg-indigo-300 md:border-indigo-300/30 md:bg-indigo-300/[0.12] md:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]";
        }
        return isDayMode
            ? "text-slate-600 hover:text-blue-800 md:hover:border-white/70 md:hover:bg-white/55"
            : "text-slate-300 hover:text-white md:hover:border-white/10 md:hover:bg-white/[0.055]";
    };
    const partnerMotionProps = {
        whileTap: { scale: 0.98 },
        transition: { duration: 0.14, ease: "easeOut" },
    };

    const applyPartnerFilter = (partner) => {
        const partnerId = partner?.id ?? null;
        if (
            activePartnerId !== null &&
            activePartnerId !== undefined &&
            String(activePartnerId) === String(partnerId)
        ) {
            onClearPartnerFilter?.();
            return;
        }

        onApplyPartnerFilter?.({
            id: partnerId,
            name: partner.displayName,
            terms: partner.terms,
        });
    };

    return (
        <section
            className={`${className} relative z-20`}
            aria-label={t("events.organizations.aria", "社团活动筛选")}
            data-testid="organization-partner-filter-bar"
        >
            <div className={`relative flex overflow-hidden border-y ${shellClass}`}>
                <div
                    ref={scrollRef}
                    {...dragScrollProps}
                    className="scrollbar-none flex min-w-0 flex-1 cursor-grab select-none snap-x snap-proximity gap-1.5 overflow-x-auto overscroll-x-contain scroll-smooth px-1 py-0 touch-pan-x active:cursor-grabbing md:gap-2 md:px-3 md:py-2.5"
                    role="group"
                    aria-label={t("events.organizations.filter_group", "按社团筛选活动")}
                >
                    <motion.button
                        {...partnerMotionProps}
                        type="button"
                        data-drag-scroll-ignore
                        aria-pressed={isAllActive}
                        onClick={() => onClearPartnerFilter?.()}
                        className={`${buttonBase} w-12 md:w-24 ${getButtonClass(isAllActive)}`}
                    >
                        <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] ${
                                isAllActive
                                    ? isDayMode
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-indigo-300/15 text-indigo-100"
                                    : isDayMode
                                      ? "bg-slate-100 text-slate-500"
                                      : "bg-white/[0.07] text-slate-300"
                            }`}
                        >
                            <LayoutGrid size={16} aria-hidden="true" />
                        </span>
                        <span className="line-clamp-1 max-w-full text-xs font-bold leading-3 md:leading-4">
                            {t("common.all", "全部")}
                        </span>
                    </motion.button>

                    {buttonPartners.map((partner) => {
                        const active = String(activePartnerId ?? "") === String(partner.id ?? "");
                        return (
                            <motion.button
                                {...partnerMotionProps}
                                key={partner.id}
                                type="button"
                                data-drag-scroll-ignore
                                aria-label={t(
                                    active
                                        ? "events.organizations.clear_partner_filter"
                                        : "events.organizations.filter_by_partner",
                                    active ? "清除 {{name}} 筛选" : "筛选 {{name}} 的活动",
                                    { name: partner.displayName }
                                )}
                                aria-pressed={active}
                                data-testid={`organization-partner-button-${partner.id}`}
                                onClick={() => applyPartnerFilter(partner)}
                                className={`${buttonBase} w-[5.5rem] md:w-40 ${getButtonClass(active)}`}
                            >
                                <PartnerLogo
                                    partner={partner}
                                    name={partner.displayName}
                                    isDayMode={isDayMode}
                                />
                                <span className="min-w-0 max-w-full md:flex-1">
                                    <span
                                        className="line-clamp-2 max-w-full text-xs font-bold leading-4 md:hidden"
                                        title={partner.displayName}
                                    >
                                        {String(language).startsWith("zh")
                                            ? partner.displayName.replace(
                                                  /^(浙江大学|浙大)(?=.)/,
                                                  ""
                                              )
                                            : partner.displayName}
                                    </span>
                                    <span className="hidden max-w-full text-xs font-bold leading-4 md:block md:truncate">
                                        {partner.displayName}
                                    </span>
                                    <span
                                        className={`mt-0.5 hidden text-xs font-semibold leading-4 md:block ${
                                            active
                                                ? isDayMode
                                                    ? "text-blue-600"
                                                    : "text-indigo-200"
                                                : isDayMode
                                                  ? "text-slate-600"
                                                  : "text-slate-500"
                                        }`}
                                    >
                                        {t(
                                            "events.organizations.event_count_short",
                                            "{{count}} 场",
                                            {
                                                count: partner.eventCount,
                                            }
                                        )}
                                    </span>
                                </span>
                            </motion.button>
                        );
                    })}
                </div>
                <button
                    ref={directoryTriggerRef}
                    type="button"
                    aria-expanded={directoryOpen}
                    aria-controls={directoryId}
                    onClick={() => {
                        setDirectoryOpen((open) => !open);
                        setSearch("");
                    }}
                    className={`inline-flex w-[64px] shrink-0 flex-col items-center justify-center gap-1 border-l border-current/10 px-2 text-xs font-semibold md:hidden ${isDayMode ? "text-blue-700" : "text-indigo-200"}`}
                >
                    <span className="text-[11px] leading-4">
                        {t("events.organizations.mobile_directory", "全部组织")}
                    </span>
                    <ChevronDown size={16} className={directoryOpen ? "rotate-180" : ""} />
                </button>
                <span className={`sr-only ${mutedClass}`}>
                    {t("events.organizations.sorted_by_count", "社团已按活动数量从高到低排序")}
                </span>
            </div>
            {directoryOpen && (
                <div
                    id={directoryId}
                    className={`mb-2 border p-3 md:hidden ${isDayMode ? "border-slate-200 bg-white text-slate-800" : "border-white/15 bg-slate-950 text-slate-100"}`}
                    onKeyDown={(event) => {
                        if (event.key === "Escape") {
                            event.stopPropagation();
                            closeDirectory();
                        }
                    }}
                >
                    <label
                        className={`mb-2 flex min-h-12 items-center gap-2 border px-3 ${isDayMode ? "border-slate-200" : "border-white/15"}`}
                    >
                        <Search size={16} aria-hidden="true" />
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            aria-label={t("events.organizations.mobile_search", "搜索组织名称")}
                            placeholder={t("events.organizations.mobile_search", "搜索组织名称")}
                            className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none"
                        />
                    </label>
                    <div className="max-h-72 overflow-y-auto overscroll-contain">
                        <button
                            type="button"
                            aria-pressed={isAllActive}
                            className={`min-h-11 w-full px-2 text-left text-sm font-semibold ${getButtonClass(isAllActive)}`}
                            onClick={() => {
                                onClearPartnerFilter?.();
                                closeDirectory();
                            }}
                        >
                            {t("common.all", "全部")}
                        </button>
                        {matchingPartners.map((partner) => (
                            <button
                                key={partner.id}
                                type="button"
                                aria-pressed={String(activePartnerId) === String(partner.id)}
                                onClick={() => {
                                    applyPartnerFilter(partner);
                                    closeDirectory();
                                }}
                                className={`flex min-h-12 w-full items-center justify-between gap-3 px-2 py-2 text-left text-sm ${getButtonClass(String(activePartnerId) === String(partner.id))}`}
                            >
                                <span className="min-w-0 break-words">{partner.displayName}</span>
                                <span className={`shrink-0 text-xs ${mutedClass}`}>
                                    {t("events.organizations.event_count_short", "{{count}} 场", {
                                        count: partner.eventCount,
                                    })}
                                </span>
                            </button>
                        ))}
                        {matchingPartners.length === 0 && (
                            <p role="status" className={`py-3 text-sm ${mutedClass}`}>
                                {t("events.organizations.no_matches")}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
};

export default OrganizationPartnerWall;
