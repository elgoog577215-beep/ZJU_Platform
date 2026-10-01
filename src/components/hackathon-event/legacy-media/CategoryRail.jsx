// Restored from 415ae0b4a MediaLibrary; rounded to match the earlier gallery.
import { memo } from "react";
import { motion } from "framer-motion";

const CategoryRail = memo(
    ({ categories, activeCategoryId, onChange, isDayMode, allLabel, label }) => {
        const nightFocusClass = isDayMode
            ? "focus-visible:ring-blue-400/55"
            : "focus-visible:border-white/[0.22] focus-visible:ring-slate-300/35 focus-visible:shadow-[0_0_0_4px_rgba(148,163,184,0.12)]";
        const channelButtonClass = (active) =>
            `rounded-full relative min-h-9 shrink-0 px-3 text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 md:min-h-10 md:px-4 md:text-sm ${nightFocusClass} ${
                active
                    ? isDayMode
                        ? "text-slate-950"
                        : "text-indigo-100"
                    : isDayMode
                      ? "text-slate-500 hover:bg-white/70 hover:text-slate-900"
                      : "text-slate-300 hover:bg-white/[0.055] hover:text-white"
            }`;

        const renderActivePill = () => (
            <motion.span
                layoutId="media-category-active"
                className={`absolute inset-0 rounded-full ${
                    isDayMode
                        ? "border border-slate-300 bg-white shadow-[0_4px_12px_rgba(15,23,42,0.06)]"
                        : "border border-indigo-400/35 bg-indigo-500/20 shadow-none"
                }`}
                transition={{ type: "spring", bounce: 0.12, duration: 0.42 }}
            />
        );

        return (
            <div
                className="relative z-10 w-full max-w-full md:max-w-fit"
                role="group"
                aria-label={label}
            >
                <div
                    className={`relative rounded-3xl overflow-visible border-0 p-0 md:border md:p-1 ${
                        isDayMode
                            ? "border-slate-200/80 bg-white shadow-none"
                            : "border-white/[0.12] bg-[#070a14]/92 shadow-none"
                    }`}
                >
                    <div
                        className={`relative rounded-3xl min-w-0 overflow-hidden border-0 bg-transparent md:border ${
                            isDayMode
                                ? "border-slate-200/80 md:bg-slate-50"
                                : "border-white/[0.09] md:bg-[#050712]/88"
                        }`}
                    >
                        <div className="scrollbar-none flex min-w-0 items-center justify-start gap-1 overflow-x-auto p-0.5 pr-8 md:pr-0.5">
                            <button
                                type="button"
                                aria-pressed={!activeCategoryId}
                                onClick={() => onChange("")}
                                className={channelButtonClass(!activeCategoryId)}
                            >
                                {!activeCategoryId && renderActivePill()}
                                <span className="relative z-10 whitespace-nowrap">{allLabel}</span>
                            </button>

                            {categories.map((category) => {
                                const active = String(activeCategoryId) === String(category.id);
                                return (
                                    <button
                                        key={category.id}
                                        type="button"
                                        aria-pressed={active}
                                        onClick={() => onChange(String(category.id))}
                                        className={channelButtonClass(active)}
                                    >
                                        {active && renderActivePill()}
                                        <span className="relative z-10 whitespace-nowrap">
                                            {category.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
);
CategoryRail.displayName = "CategoryRail";
export default CategoryRail;
