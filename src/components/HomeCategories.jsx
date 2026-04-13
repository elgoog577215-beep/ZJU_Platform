import { memo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Camera,
  Music,
  Film,
  BookOpen,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { normalizeExternalImageUrl } from "../utils/imageUtils";
import { useReducedMotion } from "../utils/animations";
import { useSettings } from "../context/SettingsContext";

const categories = [
  {
    id: "events",
    path: "/events",
    icon: Calendar,
    image:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop&q=80",
    color: "from-red-500/80 to-orange-600/80",
    delay: 0.05,
  },
  {
    id: "articles",
    path: "/articles",
    icon: BookOpen,
    image:
      "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800&auto=format&fit=crop&q=80",
    color: "from-emerald-500/80 to-teal-600/80",
    delay: 0.1,
  },
  {
    id: "music",
    path: "/music",
    icon: Music,
    image:
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80",
    color: "from-cyan-500/80 to-blue-600/80",
    delay: 0.15,
  },
  {
    id: "gallery",
    path: "/gallery",
    icon: Camera,
    image:
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80",
    color: "from-purple-500/80 to-indigo-600/80",
    delay: 0.2,
  },
  {
    id: "videos",
    path: "/videos",
    icon: Film,
    image:
      "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&auto=format&fit=crop&q=80",
    color: "from-pink-500/80 to-rose-600/80",
    delay: 0.25,
  },
];

const CategoryCard = memo(({ item, reduceMotion, isDayMode }) => {
  const { t } = useTranslation();
  const optimizedImage = normalizeExternalImageUrl(item.image, 720);

  return (
    <motion.div
      variants={
        reduceMotion
          ? undefined
          : {
              hidden: { opacity: 0, y: 50 },
              visible: {
                opacity: 1,
                y: 0,
                transition: {
                  type: "spring",
                  stiffness: 100,
                  damping: 20,
                },
              },
            }
      }
      whileHover={reduceMotion ? undefined : { y: -15, scale: 1.02 }}
      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
      transition={
        reduceMotion
          ? undefined
          : { type: "spring", stiffness: 300, damping: 20 }
      }
      className={`relative group h-[200px] sm:h-[280px] md:h-[350px] lg:h-[400px] w-full overflow-hidden rounded-2xl sm:rounded-[2rem] cursor-pointer border backdrop-blur-sm transition-all duration-300 ${
        isDayMode
          ? "border-slate-200/80 shadow-[0_20px_50px_rgba(148,163,184,0.18)] bg-white/55 hover:shadow-[0_24px_60px_rgba(148,163,184,0.22)] hover:border-indigo-200/80"
          : "border-white/10 shadow-2xl bg-black/40 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] hover:border-white/20"
      }`}
    >
      <Link to={item.path} className="block w-full h-full">
        <div className="absolute inset-0">
          <img
            src={optimizedImage}
            alt={t(`nav.${item.id}`)}
            loading="lazy"
            decoding="async"
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 20vw"
            className={`w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 ${
              reduceMotion ? "" : "transition-transform duration-700 group-hover:scale-110"
            }`}
          />
        </div>

        <div
          className={`absolute inset-0 bg-gradient-to-br ${item.color} ${
            isDayMode
              ? "opacity-28 group-hover:opacity-36"
              : "opacity-40 group-hover:opacity-60"
          } transition-opacity duration-500 mix-blend-overlay`}
        />
        <div
          className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-xl hidden md:block`}
        />
        <div
          className={`absolute inset-0 ${
            isDayMode
              ? "bg-gradient-to-t from-slate-950/78 via-slate-900/22 to-transparent"
              : "bg-gradient-to-t from-black via-black/40 to-transparent"
          } opacity-90`}
        />
        <div
          className={`absolute inset-0 ${
            isDayMode
              ? "bg-gradient-to-tr from-white/25 to-transparent"
              : "bg-gradient-to-tr from-white/5 to-transparent"
          } opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
        />

        <div className="absolute inset-0 p-4 sm:p-6 md:p-8 flex flex-col justify-end">
          <div
            className={`${
              reduceMotion
                ? ""
                : "transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500"
            }`}
          >
            <div
              className={`mb-2 sm:mb-4 inline-block p-2.5 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl backdrop-blur-xl border text-white group-hover:scale-110 transition-all duration-300 ${
                isDayMode
                  ? "bg-white/72 border-white/50 shadow-[0_12px_28px_rgba(15,23,42,0.18)] group-hover:bg-white/84"
                  : "bg-white/5 border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] group-hover:bg-white/10"
              }`}
            >
              <item.icon
                size={20}
                strokeWidth={1.5}
                className="sm:w-6 sm:h-6 md:w-8 md:h-8 drop-shadow-lg"
              />
            </div>

            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 mb-1 sm:mb-2 tracking-tight group-hover:to-white transition-all">
              {t(`nav.${item.id}`)}
            </h3>

            <p
              className={`hidden sm:block mb-4 md:mb-6 max-w-xs opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 transform translate-y-2 group-hover:translate-y-0 text-sm md:text-base ${
                isDayMode ? "text-slate-200" : "text-gray-300"
              }`}
            >
              {t(`home.categories.${item.id}_desc`)}
            </p>

            <div className="flex items-center gap-2 text-white font-bold tracking-wider uppercase text-xs sm:text-sm">
              <span>{t("common.explore")}</span>
              <ArrowRight
                size={14}
                className="sm:w-4 sm:h-4 transform group-hover:translate-x-2 transition-transform duration-300"
              />
            </div>
          </div>
        </div>

        <div
          className={`absolute inset-0 border rounded-2xl sm:rounded-3xl transition-colors duration-500 pointer-events-none ${
            isDayMode
              ? "border-slate-200/70 group-hover:border-indigo-200/80"
              : "border-white/10 group-hover:border-white/30"
          }`}
        />
      </Link>
    </motion.div>
  );
});
CategoryCard.displayName = "CategoryCard";

const HomeCategories = () => {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === "day";

  return (
    <section
      className={`py-12 sm:py-16 md:py-24 px-4 md:px-8 relative z-10 pb-28 md:pb-0 ${
        isDayMode ? "bg-white/28" : "bg-black"
      }`}
      style={{ contentVisibility: "auto", containIntrinsicSize: "1000px" }}
    >
      <div className="max-w-[1800px] mx-auto">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-12 md:mb-16"
        >
          <h2
            className={`text-3xl sm:text-4xl md:text-6xl font-bold font-serif mb-3 sm:mb-4 ${
              isDayMode ? "text-slate-900" : "text-white"
            }`}
          >
            {t("home.discover")}
          </h2>
          <div
            className={`w-24 h-1 mx-auto ${
              isDayMode
                ? "bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent"
                : "bg-gradient-to-r from-transparent via-white/50 to-transparent"
            }`}
          />
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6"
          initial={prefersReducedMotion ? false : "hidden"}
          whileInView={prefersReducedMotion ? undefined : "visible"}
          viewport={{ once: true, margin: "-50px" }}
          variants={
            prefersReducedMotion
              ? undefined
              : {
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.1,
                    },
                  },
                }
          }
        >
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              item={category}
              reduceMotion={prefersReducedMotion}
              isDayMode={isDayMode}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HomeCategories;
