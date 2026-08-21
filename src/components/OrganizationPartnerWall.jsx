import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { LayoutGrid, Users } from "lucide-react";
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
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full px-1 ${
                    isDayMode ? "bg-slate-100/70" : "bg-white/[0.05]"
                }`}
            >
                <img
                    src={logoSrc}
                    alt={`${name} logo`}
                    className="max-h-[70%] max-w-full object-contain"
                    loading="lazy"
                    decoding="async"
                />
            </span>
        );
    }

    return (
        <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                isDayMode ? "bg-slate-100/70 text-slate-500" : "bg-white/[0.05] text-slate-400"
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
    const mutedClass = isDayMode ? "text-slate-500" : "text-slate-400";
    const shellClass = isDayMode ? "border-slate-200/80" : "border-white/[0.105]";
    const buttonBase =
        "relative flex w-12 shrink-0 flex-col items-center gap-0.5 border-b-2 border-transparent px-0.5 py-1 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 md:w-[4.85rem] md:gap-1 md:px-1.5 md:py-1.5";
    const getButtonClass = (active) => {
        if (active) {
            return isDayMode
                ? "border-blue-600 text-blue-800"
                : "border-indigo-300 text-indigo-100";
        }
        return isDayMode ? "text-slate-600 hover:text-blue-800" : "text-slate-300 hover:text-white";
    };
    const partnerMotionProps = {
        whileHover: { opacity: 0.92 },
        whileTap: { opacity: 0.72 },
        transition: { type: "spring", stiffness: 520, damping: 34 },
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
            <div className={`relative overflow-hidden border-y ${shellClass}`}>
                <div
                    ref={scrollRef}
                    {...dragScrollProps}
                    className="scrollbar-none flex cursor-grab select-none gap-1.5 overflow-x-auto overscroll-x-contain scroll-smooth px-3 py-2 pr-10 touch-pan-x active:cursor-grabbing md:gap-2"
                    role="group"
                    aria-label={t("events.organizations.filter_group", "按社团筛选活动")}
                >
                    <motion.button
                        {...partnerMotionProps}
                        type="button"
                        data-drag-scroll-ignore
                        aria-pressed={isAllActive}
                        onClick={() => onClearPartnerFilter?.()}
                        className={`${buttonBase} ${getButtonClass(isAllActive)}`}
                    >
                        <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center ${
                                isAllActive
                                    ? isDayMode
                                        ? "text-blue-700"
                                        : "text-indigo-100"
                                    : isDayMode
                                      ? "text-slate-500"
                                      : "text-slate-300"
                            }`}
                        >
                            <LayoutGrid size={16} aria-hidden="true" />
                        </span>
                        <span className="line-clamp-1 max-w-full text-[11px] font-bold leading-3">
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
                                className={`${buttonBase} ${getButtonClass(active)}`}
                            >
                                <PartnerLogo
                                    partner={partner}
                                    name={partner.displayName}
                                    isDayMode={isDayMode}
                                />
                                <span className="line-clamp-1 max-w-full text-[11px] font-bold leading-3 md:line-clamp-2">
                                    {partner.displayName}
                                </span>
                                <span
                                    className={`absolute right-1 top-1 text-[9px] font-black leading-none ${
                                        active
                                            ? isDayMode
                                                ? "text-blue-700"
                                                : "text-indigo-100"
                                            : isDayMode
                                              ? "text-slate-400"
                                              : "text-slate-500"
                                    }`}
                                >
                                    {t("events.organizations.event_count_short", "{{count}} 场", {
                                        count: partner.eventCount,
                                    })}
                                </span>
                            </motion.button>
                        );
                    })}
                </div>
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-1 right-0 top-1 w-12 bg-gradient-to-l from-[var(--theme-bg)] to-transparent"
                />
                <span className={`sr-only ${mutedClass}`}>
                    {t("events.organizations.sorted_by_count", "社团已按活动数量从高到低排序")}
                </span>
            </div>
        </section>
    );
};

export default OrganizationPartnerWall;
