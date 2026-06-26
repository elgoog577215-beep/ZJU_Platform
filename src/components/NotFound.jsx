import React from "react";
import { motion } from "framer-motion";
import { Home, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const NotFound = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section className="relative z-50 flex min-h-screen flex-col items-center justify-center bg-black px-4 pb-24 pt-[calc(env(safe-area-inset-top)+76px)] text-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-sm text-center"
      >
        <div className="pointer-events-none absolute inset-x-10 top-6 h-40 rounded-full bg-indigo-500/10 blur-[70px] md:inset-0 md:h-auto md:blur-[100px]" />
        <motion.h1
          className="mb-3 bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 bg-clip-text font-serif text-6xl font-bold text-transparent drop-shadow-2xl md:mb-4 md:text-9xl"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          404
        </motion.h1>
        <p className="relative z-10 mb-3 text-lg text-gray-400 md:mb-8 md:text-2xl">
          {t("not_found.title")}
        </p>
        <p className="relative z-10 mx-auto mb-5 max-w-md text-sm leading-6 text-gray-500 md:mb-8 md:text-base">
          {t("not_found.description")}
        </p>

        <div className="flex items-center justify-center gap-2 sm:gap-4">
          <button
            onClick={() => navigate(-1)}
            className="group relative z-10 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 text-sm text-white backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white/10 sm:px-8"
          >
            <ArrowLeft
              size={17}
              className="text-gray-400 group-hover:text-white transition-colors"
            />
            <span className="font-medium">{t("common.back", "Back")}</span>
          </button>

          <Link
            to="/"
            className="group relative z-10 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 text-sm text-white backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white/10 sm:px-8"
          >
            <Home
              size={17}
              className="text-indigo-400 group-hover:text-white transition-colors"
            />
            <span className="font-medium">{t("not_found.go_home")}</span>
          </Link>
        </div>
      </motion.div>
    </section>
  );
};

export default NotFound;
