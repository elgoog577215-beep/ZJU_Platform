import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useSettings } from "../context/SettingsContext";
import {
  Send,
  CheckCircle,
  AlertCircle,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import api from "../services/api";
import { normalizeExternalImageUrl } from "../utils/imageUtils";
import SEO from "./SEO";

const About = () => {
  const { t } = useTranslation();
  const { settings, uiMode } = useSettings();
  const profileImageUrl = normalizeExternalImageUrl(
    settings.profile_image_url ||
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80",
    960,
  );
  const isDayMode = uiMode === "day";

  // Contact Form State
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [status, setStatus] = useState("idle"); // idle, submitting, success, error

  // FIX: BUG-27 — Store timeout IDs in ref and clear on unmount
  const statusTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);

    if (!formState.name || !formState.email || !formState.message) {
      setStatus("error");
      statusTimeoutRef.current = setTimeout(() => setStatus("idle"), 3000);
      return;
    }

    setStatus("submitting");

    try {
      await api.post("/contact", formState);
      setStatus("success");
      setFormState({ name: "", email: "", message: "" });
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to send message:", error);
      }
      setStatus("error");
    } finally {
      statusTimeoutRef.current = setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const handleChange = (e) => {
    setFormState((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen">
      <SEO
        title="关于"
        description="了解拓途浙享项目背景、团队定位与联系方式。"
      />
      {/* About Section  */}
      <section
        className="pt-[calc(env(safe-area-inset-top)+88px)] pb-[calc(env(safe-area-inset-bottom)+96px)] md:py-24 px-4 flex items-center"
      >
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 md:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div
              className={`absolute -inset-4 border-2 rounded-lg translate-x-4 translate-y-4 ${isDayMode ? "border-indigo-200/70 bg-white/30" : "border-white/20"}`}
            />
            <img
              src={profileImageUrl}
              alt="Photographer"
              className={`relative z-10 rounded-lg transition-all duration-500 ${isDayMode ? "shadow-[0_24px_70px_rgba(148,163,184,0.2)] grayscale-0" : "shadow-2xl grayscale hover:grayscale-0"}`}
              loading="lazy"
              decoding="async"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h2
              className={`text-3xl md:text-5xl font-bold font-serif mb-6 md:mb-8 leading-tight ${isDayMode ? "text-slate-900" : "text-white"}`}
            >
              {settings.about_title || t("about.title")} <br />
              <span className={isDayMode ? "text-slate-500" : "text-gray-500"}>
                {settings.about_subtitle || t("about.subtitle")}
              </span>
            </h2>
            <p
              className={`text-base md:text-lg mb-5 md:mb-6 leading-relaxed whitespace-pre-line ${isDayMode ? "text-slate-600" : "text-gray-300"}`}
            >
              {settings.about_intro || t("about.p1")}
            </p>
            <p
              className={`text-base md:text-lg mb-6 md:mb-8 leading-relaxed whitespace-pre-line ${isDayMode ? "text-slate-600" : "text-gray-300"}`}
            >
              {settings.about_detail || t("about.p2")}
            </p>

            <div className="flex flex-wrap gap-6 md:gap-8">
              <div>
                <span
                  className={`block text-2xl md:text-3xl font-bold font-serif ${isDayMode ? "text-slate-900" : "text-white"}`}
                >
                  {settings.about_exp_years || "10+"}
                </span>
                <span
                  className={`text-xs md:text-sm ${isDayMode ? "text-slate-500" : "text-gray-500"}`}
                >
                  {t("about.exp")}
                </span>
              </div>
              <div>
                <span
                  className={`block text-2xl md:text-3xl font-bold font-serif ${isDayMode ? "text-slate-900" : "text-white"}`}
                >
                  {settings.about_exhibitions || "50+"}
                </span>
                <span
                  className={`text-xs md:text-sm ${isDayMode ? "text-slate-500" : "text-gray-500"}`}
                >
                  {t("about.exhibitions")}
                </span>
              </div>
              <div>
                <span
                  className={`block text-2xl md:text-3xl font-bold font-serif ${isDayMode ? "text-slate-900" : "text-white"}`}
                >
                  {settings.about_projects || "200+"}
                </span>
                <span
                  className={`text-xs md:text-sm ${isDayMode ? "text-slate-500" : "text-gray-500"}`}
                >
                  {t("about.projects")}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <section
        className={`py-20 md:py-24 px-4 pb-28 md:pb-24 relative overflow-hidden ${isDayMode ? "bg-white/35" : "bg-white/5"}`}
      >
        {/* Background Elements - Hidden on mobile */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 hidden md:block">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-6xl w-full mx-auto relative z-10 grid lg:grid-cols-2 gap-12 lg:gap-24 items-start">
          {/* Left: Info & Socials */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="space-y-12"
          >
            <div>
              <h2
                className={`text-4xl md:text-7xl font-bold font-serif mb-5 md:mb-6 bg-clip-text text-transparent leading-tight ${isDayMode ? "bg-gradient-to-r from-slate-900 via-indigo-700 to-slate-500" : "bg-gradient-to-r from-white to-gray-500"}`}
              >
                {t("contact.title")}
              </h2>
              <p
                className={`text-base md:text-xl max-w-md leading-relaxed ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
              >
                {t("contact.subtitle")}
              </p>
            </div>

            <div className="space-y-6">
              <div
                className={`flex items-center gap-4 group cursor-pointer ${isDayMode ? "text-slate-600" : "text-gray-300"}`}
              >
                <div
                  className={`p-4 rounded-2xl transition-all ${isDayMode ? "bg-white/80 border border-slate-200/80 group-hover:bg-white shadow-[0_14px_36px_rgba(148,163,184,0.14)]" : "bg-white/5 border border-white/10 group-hover:bg-white/10 group-hover:border-white/20"}`}
                >
                  <Mail size={24} className="text-indigo-400" />
                </div>
                <div>
                  <div
                    className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDayMode ? "text-slate-500" : "text-gray-500"}`}
                  >
                    {t("contact.email_label")}
                  </div>
                  <div className="text-base md:text-lg font-medium break-all">
                    {settings.contact_email || "service@tuotuzju.com"}
                  </div>
                </div>
              </div>

              <div
                className={`flex items-center gap-4 group cursor-pointer ${isDayMode ? "text-slate-600" : "text-gray-300"}`}
              >
                <div
                  className={`p-4 rounded-2xl transition-all ${isDayMode ? "bg-white/80 border border-slate-200/80 group-hover:bg-white shadow-[0_14px_36px_rgba(148,163,184,0.14)]" : "bg-white/5 border border-white/10 group-hover:bg-white/10 group-hover:border-white/20"}`}
                >
                  <MapPin size={24} className="text-pink-400" />
                </div>
                <div>
                  <div
                    className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDayMode ? "text-slate-500" : "text-gray-500"}`}
                  >
                    {t("contact.studio_label")}
                  </div>
                  <div className="text-base md:text-lg font-medium">
                    {settings.contact_address ||
                      "浙江大学 SQTP 项目：拓途浙享团队"}
                  </div>
                </div>
              </div>

              <div
                className={`flex items-center gap-4 group cursor-pointer ${isDayMode ? "text-slate-600" : "text-gray-300"}`}
              >
                <div
                  className={`p-4 rounded-2xl transition-all ${isDayMode ? "bg-white/80 border border-slate-200/80 group-hover:bg-white shadow-[0_14px_36px_rgba(148,163,184,0.14)]" : "bg-white/5 border border-white/10 group-hover:bg-white/10 group-hover:border-white/20"}`}
                >
                  <Phone size={24} className="text-cyan-400" />
                </div>
                <div>
                  <div
                    className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDayMode ? "text-slate-500" : "text-gray-500"}`}
                  >
                    {t("contact.phone_label")}
                  </div>
                  <div className="text-base md:text-lg font-medium">
                    {settings.contact_phone || "0571-87950000"}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className={`backdrop-blur-xl rounded-3xl p-8 md:p-10 relative overflow-hidden ${isDayMode ? "bg-white/82 border border-slate-200/80 shadow-[0_24px_70px_rgba(148,163,184,0.18)]" : "bg-white/5 border border-white/10"}`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              <div>
                <label
                  className={`block text-sm font-bold mb-2 uppercase tracking-wider ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                >
                  {t("contact.name")}
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    name="name"
                    value={formState.name}
                    onChange={handleChange}
                    placeholder={t("contact.name")}
                    className={`w-full border rounded-xl px-6 py-4 placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all ${status === "error" && !formState.name ? "border-red-500/50" : isDayMode ? "border-slate-200/80" : "border-white/10"} ${isDayMode ? "bg-white text-slate-900 focus:bg-white" : "bg-white/5 text-white focus:bg-white/10"}`}
                  />
                  {status === "error" && !formState.name && (
                    <motion.div
                      initial={{ x: -10 }}
                      animate={{ x: [0, -10, 10, -10, 0] }}
                      transition={{ duration: 0.4 }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500"
                    >
                      <AlertCircle size={18} />
                    </motion.div>
                  )}
                </div>
              </div>
              <div>
                <label
                  className={`block text-sm font-bold mb-2 uppercase tracking-wider ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                >
                  {t("contact.email")}
                </label>
                <input
                  type="email"
                  name="email"
                  value={formState.email}
                  onChange={handleChange}
                  className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors placeholder-gray-600 ${isDayMode ? "bg-white border-slate-200/80 text-slate-900" : "bg-black/20 border-white/10 text-white"}`}
                  placeholder={t("contact.email")}
                />
              </div>
              <div>
                <label
                  className={`block text-sm font-bold mb-2 uppercase tracking-wider ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                >
                  {t("contact.message")}
                </label>
                <textarea
                  name="message"
                  value={formState.message}
                  onChange={handleChange}
                  rows="4"
                  className={`w-full border rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors placeholder-gray-600 resize-none ${isDayMode ? "bg-white border-slate-200/80 text-slate-900" : "bg-black/20 border-white/10 text-white"}`}
                  placeholder={t("contact.message")}
                />
              </div>

              <button
                type="submit"
                disabled={status === "submitting"}
                className={`w-full font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group ${isDayMode ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_18px_40px_rgba(99,102,241,0.24)]" : "bg-white text-black hover:bg-gray-200"}`}
              >
                {status === "submitting" ? (
                  <span className="animate-pulse">{t("contact.sending")}</span>
                ) : status === "success" ? (
                  <>
                    <CheckCircle size={20} className="text-green-600" />
                    <span>{t("contact.sent")}</span>
                  </>
                ) : status === "error" ? (
                  <>
                    <AlertCircle size={20} className="text-red-600" />
                    <span>{t("contact.error")}</span>
                  </>
                ) : (
                  <>
                    <span>{t("contact.send")}</span>
                    <Send
                      size={18}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default About;
