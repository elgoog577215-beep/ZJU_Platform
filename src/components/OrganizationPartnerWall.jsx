import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { LayoutGrid, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  uniqueTerms([
    ...toArray(partner.event_organizer_aliases),
    partner.name,
    partner.name_en,
  ]).slice(0, 20);

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
    [language, partners],
  );

  if (buttonPartners.length === 0) return null;

  const isAllActive = activePartnerId === null || activePartnerId === undefined;
  const mutedClass = isDayMode ? "text-slate-500" : "text-slate-400";
  const shellClass = isDayMode
    ? "border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.018),0_10px_22px_rgba(15,23,42,0.03)]"
    : "border-white/[0.105] bg-[rgba(8,18,34,0.78)]";
  const buttonBase =
    "inline-flex min-h-9 max-w-[11rem] shrink-0 items-center gap-2 rounded-[4px] border px-3 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70";
  const getButtonClass = (active) => {
    if (active) {
      return isDayMode
        ? "border-blue-200 bg-blue-50 text-blue-800"
        : "border-indigo-300/30 bg-indigo-400/14 text-indigo-100";
    }
    return isDayMode
      ? "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"
      : "border-white/10 bg-white/[0.045] text-slate-200 hover:border-indigo-300/30 hover:bg-white/[0.075]";
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
      <div className={`relative overflow-hidden rounded-[4px] border md:rounded-none md:border-x-0 md:border-y ${shellClass}`}>
        <div
          ref={scrollRef}
          {...dragScrollProps}
          className="scrollbar-none flex cursor-grab select-none gap-2 overflow-x-auto overscroll-x-contain scroll-smooth px-3 py-2 pr-10 touch-pan-x active:cursor-grabbing"
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
            <LayoutGrid size={15} className="shrink-0" />
            <span>{t("common.all", "全部")}</span>
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
                  { name: partner.displayName },
                )}
                aria-pressed={active}
                data-testid={`organization-partner-button-${partner.id}`}
                onClick={() => applyPartnerFilter(partner)}
                className={`${buttonBase} ${getButtonClass(active)}`}
              >
                <Users size={15} className="shrink-0" />
                <span className="truncate">{partner.displayName}</span>
                <span
                  className={`ml-auto rounded-[3px] px-1.5 py-0.5 text-[10px] font-black leading-none ${
                    active
                      ? isDayMode
                        ? "bg-white text-blue-700"
                        : "bg-white/12 text-indigo-100"
                      : isDayMode
                        ? "bg-slate-100 text-slate-500"
                        : "bg-white/10 text-slate-300"
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
          className={`pointer-events-none absolute bottom-1 right-0 top-1 w-12 ${
            isDayMode ? "bg-gradient-to-l from-white to-transparent" : "bg-gradient-to-l from-[#0b1222] to-transparent"
          }`}
        />
        <span className={`sr-only ${mutedClass}`}>
          {t("events.organizations.sorted_by_count", "社团已按活动数量从高到低排序")}
        </span>
      </div>
    </section>
  );
};

export default OrganizationPartnerWall;
