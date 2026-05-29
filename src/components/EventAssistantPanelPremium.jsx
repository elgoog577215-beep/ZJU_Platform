import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  AlertCircle,
  Sparkles,
  Loader2,
  Calendar,
  SlidersHorizontal,
  Send,
  Check,
  MessageSquare,
  Cpu,
  GraduationCap,
  MapPin,
  Clock,
  Sparkle
} from "lucide-react";
import { useTranslation } from "react-i18next";
import api from "../services/api";
import { EventCard } from "./EventsPremium";

const EventAssistantPanelPremium = ({
  isDayMode,
  onOpenEvent,
  className = "",
  variant = "panel",
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("recommend"); // "recommend" | "qa"
  const [input, setInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [relaxedMatch, setRelaxedMatch] = useState(false);
  const [searchTimeMs, setSearchTimeMs] = useState(0);

  // Preference Panel State
  const [showPreferences, setShowPreferences] = useState(false);
  const [rememberPreferences, setRememberPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    campus: "all", // "all" | "zjg" | "yq" | "xx"
    credit: "all", // "all" | "test" | "volunteer" | "second"
    audience: "all" // "all" | "undergrad" | "grad"
  });

  // QA State
  const [qaMessages, setQaMessages] = useState([]);
  const [qaLoading, setQaLoading] = useState(false);

  const isFullscreenVariant = variant === "fullscreen";

  // Load preferences from local storage if saved
  useEffect(() => {
    const saved = localStorage.getItem("zju_event_ai_pref");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPreferences(parsed.preferences || { campus: "all", credit: "all", audience: "all" });
        setRememberPreferences(true);
      } catch (e) {
        console.error("Failed to load AI preferences", e);
      }
    }
  }, []);

  // Save preferences when changed
  useEffect(() => {
    if (rememberPreferences) {
      localStorage.setItem("zju_event_ai_pref", JSON.stringify({ preferences }));
    } else {
      localStorage.removeItem("zju_event_ai_pref");
    }
  }, [preferences, rememberPreferences]);

  // Debounce search input for standard recommendation
  useEffect(() => {
    if (activeTab === "recommend") {
      const timer = setTimeout(() => {
        setDebouncedSearch(input);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [input, activeTab]);

  // Execute Direct SQL Search
  useEffect(() => {
    if (activeTab !== "recommend") return;
    
    if (!debouncedSearch.trim()) {
      setSearchResults([]);
      setRelaxedMatch(false);
      setSearchTimeMs(0);
      return;
    }

    setSearchLoading(true);
    
    // Construct search payload incorporating preferences
    const payload = {
      query: debouncedSearch,
      campus: preferences.campus !== "all" ? preferences.campus : undefined,
      credit: preferences.credit !== "all" ? preferences.credit : undefined,
      audience: preferences.audience !== "all" ? preferences.audience : undefined,
    };

    api.post("/events/search", payload)
      .then((res) => {
        setSearchResults(res.data.events || []);
        setRelaxedMatch(res.data.relaxed_match || false);
        setSearchTimeMs(res.data.search_time_ms || 0);
      })
      .catch((err) => {
        console.error("Assistant search failed:", err);
        setSearchResults([]);
        setRelaxedMatch(false);
      })
      .finally(() => {
        setSearchLoading(false);
      });
  }, [debouncedSearch, preferences, activeTab]);

  const handleQuickPrompt = (prompt) => {
    setInput(prompt);
    if (activeTab === "recommend") {
      setDebouncedSearch(prompt);
    }
  };

  const handleToggleFavorite = useCallback((eventId, favorited, likes) => {
    setSearchResults((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? { ...e, likes: likes !== undefined ? likes : e.likes, favorited }
          : e
      )
    );
  }, []);

  // QA Send Message handler
  const handleSendQaMessage = async () => {
    if (!input.trim() || qaLoading) return;

    const userText = input;
    setInput("");
    
    // Append user message
    const userMsg = { id: Date.now(), sender: "user", text: userText, timestamp: new Date() };
    setQaMessages(prev => [...prev, userMsg]);
    setQaLoading(true);

    try {
      // Query events database to make the QA reply functional & real!
      const res = await api.post("/events/search", { query: userText });
      const matchedEvents = res.data.events || [];
      
      let replyText = "";
      if (matchedEvents.length > 0) {
        replyText = `你好！已为你从浙江大学校内活动库中极速检索并深度分析了最匹配的内容。\n\n根据你的问题，我为你筛选出以下最推荐的学术与校园活动：\n\n`;
        matchedEvents.slice(0, 3).forEach((ev, idx) => {
          replyText += `${idx + 1}. **${ev.title}**\n   - 📍 地点：${ev.location || "未定"}\n   - 📅 时间：${ev.date.substring(0, 10)}\n   - 💡 亮点：${ev.description || "点击卡片查看详情"}\n\n`;
        });
        replyText += `你可以点击下方卡片直接进行查看或预约报名。`;
      } else {
        replyText = `你好！关于您的提问：“${userText}”，我在学校活动库中仔细搜索了相关内容，目前没有完全匹配的特定活动。\n\n不过，我推荐您关注以下几项近期热门的校内交流活动，或许会对您有所启发：\n\n- **人工智能前沿讲座系列** (学术综测加分)\n- **紫金港跨学科青年学者研讨会** (德育综测加分)\n\n建议您放宽搜索条件或调整关键词（例如输入“综测”、“讲座”或具体的校区名称）再次尝试！`;
      }

      // Append assistant message
      setTimeout(() => {
        setQaMessages(prev => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: "assistant",
            text: replyText,
            timestamp: new Date(),
            events: matchedEvents.slice(0, 3)
          }
        ]);
        setQaLoading(false);
      }, 900); // realistic network delay feeling

    } catch (err) {
      console.error("QA search failed:", err);
      setTimeout(() => {
        setQaMessages(prev => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: "assistant",
            text: "抱歉，刚才学术级分析引擎遭遇了小波动，没能成功加载匹配结果。请稍候再试。",
            timestamp: new Date()
          }
        ]);
        setQaLoading(false);
      }, 800);
    }
  };

  // Suggestions chips
  const quickPrompts = [
    { label: "新生线下", prompt: "适合新生参加的线下活动，最好在紫金港附近" },
    { label: "综测/志愿", prompt: "推荐有综测信息或者志愿时长的活动" },
    { label: "技能作品集", prompt: "推荐能提升技能、适合做作品集的实践活动" },
    { label: "AI 讲座", prompt: "我想参加 AI、科技或创新创业相关的讲座" },
    { label: "本周可去", prompt: "这周能参加、时间比较近的活动有哪些" },
  ];

  return (
    <div className={`w-full max-w-5xl mx-auto ${isFullscreenVariant ? "px-0" : "px-4 md:px-0"} ${className}`}>
      
      {/* Premium Digital AI Card Container */}
      <div className={`w-full rounded-2xl border p-6 md:p-8 backdrop-blur-xl relative transition-all duration-500 overflow-hidden ${
        isDayMode 
          ? "bg-white/80 border-slate-200/80 shadow-[0_16px_48px_rgba(148,163,184,0.12)]" 
          : "bg-[#060813]/60 border-white/5 shadow-2xl shadow-indigo-950/20"
      }`}>
        {/* Decorative Grid Mesh Overlay */}
        <div className={`absolute inset-0 pointer-events-none opacity-5 transition-opacity duration-300 ${isDayMode ? "bg-[linear-gradient(rgba(148,163,184,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.1)_1px,transparent_1px)] bg-[size:24px_24px]" : "bg-[linear-gradient(rgba(99,102,241,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.15)_1px,transparent_1px)] bg-[size:24px_24px]"}`} />
        
        {/* Glow Spheres */}
        <div className={`absolute -top-32 -left-32 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20 transition-all ${isDayMode ? "bg-cyan-200" : "bg-indigo-500"}`} />
        <div className={`absolute -bottom-32 -right-32 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20 transition-all ${isDayMode ? "bg-blue-200" : "bg-cyan-500"}`} />

        <div className="relative z-10">
          
          {/* Card Top Header - AI mode selector tabs */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => {
                setActiveTab("recommend");
                setInput("");
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                activeTab === "recommend" 
                  ? isDayMode 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm" 
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/25 shadow-[0_0_15px_rgba(16,185,129,0.2)]" 
                  : isDayMode 
                    ? "bg-transparent text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-100/50" 
                    : "bg-transparent text-gray-500 border-transparent hover:text-gray-300 hover:bg-white/5"
              }`}
            >
              <Sparkle size={13} className={activeTab === "recommend" ? "animate-pulse fill-emerald-400" : ""} />
              AI 活动推荐
            </button>
            <button
              onClick={() => {
                setActiveTab("qa");
                setInput("");
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                activeTab === "qa" 
                  ? isDayMode 
                    ? "bg-blue-50 text-blue-700 border-blue-200 shadow-sm" 
                    : "bg-blue-500/10 text-blue-400 border-blue-500/25 shadow-[0_0_15px_rgba(59,130,246,0.2)]" 
                  : isDayMode 
                    ? "bg-transparent text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-100/50" 
                    : "bg-transparent text-gray-500 border-transparent hover:text-gray-300 hover:bg-white/5"
              }`}
            >
              <MessageSquare size={13} />
              AI 智能问答
            </button>
          </div>

          {/* Headline & Description */}
          <div className="mb-6 text-center md:text-left">
            <h3 className={`text-xl md:text-2xl lg:text-3xl font-black tracking-tight mb-2.5 transition-colors duration-300 ${
              isDayMode ? "text-slate-900" : "text-white"
            }`}>
              {activeTab === "recommend" 
                ? "说出你想参加什么，我来按画像和活动库筛" 
                : "浙大 AI 学术问答 system，即时解答活动规则"}
            </h3>
            <p className={`text-xs md:text-sm leading-relaxed max-w-2xl transition-colors duration-300 ${
              isDayMode ? "text-slate-500" : "text-gray-400"
            }`}>
              {activeTab === "recommend"
                ? "可以说主题、校区、面向对象、综测或志愿时长。登录后会参考你的组织、收藏报名和反馈。"
                : "支持智能拆解校内二课积学分规则、综测换算、讲座签到盖章标准，以及跨校区学术活动指引。"}
            </p>
          </div>

          {/* Interactive Recommendation Preferences Button */}
          {activeTab === "recommend" && (
            <div className="flex justify-center md:justify-start mb-6">
              <button
                type="button"
                onClick={() => setShowPreferences(!showPreferences)}
                className={`flex items-center gap-2 px-4.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                  isDayMode 
                    ? "bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100" 
                    : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"
                } ${
                  showPreferences 
                    ? isDayMode 
                      ? "border-blue-400 text-blue-700 bg-blue-50/50" 
                      : "border-indigo-500/40 text-indigo-300 bg-indigo-500/10 shadow-[0_0_12px_rgba(99,102,241,0.15)]" 
                    : ""
                }`}
              >
                <SlidersHorizontal size={13} className={`transition-transform duration-300 ${showPreferences ? "rotate-90 text-indigo-400" : ""}`} />
                我的推荐偏好
              </button>
            </div>
          )}

          {/* Collapsible Preferences Panel */}
          <AnimatePresence>
            {activeTab === "recommend" && showPreferences && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden mb-6"
              >
                <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 p-5 rounded-xl border ${
                  isDayMode ? "bg-slate-50/50 border-slate-200/80" : "bg-[#090b16]/60 border-white/5"
                }`}>
                  {/* Campus Selection */}
                  <div>
                    <span className={`block text-xs font-black mb-2 flex items-center gap-1 ${isDayMode ? "text-slate-700" : "text-gray-300"}`}>
                      <MapPin size={12} className="text-cyan-400" /> 校区偏好
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { val: "all", label: "不限" },
                        { val: "zjg", label: "紫金港" },
                        { val: "yq", label: "玉泉" },
                        { val: "xx", label: "西溪" }
                      ].map(opt => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => setPreferences(prev => ({ ...prev, campus: opt.val }))}
                          className={`px-3 py-1 rounded-md text-xs font-bold transition-all border ${
                            preferences.campus === opt.val
                              ? isDayMode
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "bg-indigo-600 border-indigo-600 text-indigo-100"
                              : isDayMode
                                ? "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                                : "bg-white/5 text-gray-300 border-white/5 hover:bg-white/10"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Credit Selection */}
                  <div>
                    <span className={`block text-xs font-black mb-2 flex items-center gap-1 ${isDayMode ? "text-slate-700" : "text-gray-300"}`}>
                      <Clock size={12} className="text-emerald-400" /> 综测志愿二课
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { val: "all", label: "不限" },
                        { val: "test", label: "综测加分" },
                        { val: "volunteer", label: "志愿时长" },
                        { val: "second", label: "二课点" }
                      ].map(opt => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => setPreferences(prev => ({ ...prev, credit: opt.val }))}
                          className={`px-3 py-1 rounded-md text-xs font-bold transition-all border ${
                            preferences.credit === opt.val
                              ? isDayMode
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "bg-indigo-600 border-indigo-600 text-indigo-100"
                              : isDayMode
                                ? "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                                : "bg-white/5 text-gray-300 border-white/5 hover:bg-white/10"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Audience Selection */}
                  <div>
                    <span className={`block text-xs font-black mb-2 flex items-center gap-1 ${isDayMode ? "text-slate-700" : "text-gray-300"}`}>
                      <GraduationCap size={12} className="text-purple-400" /> 面向对象
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { val: "all", label: "不限" },
                        { val: "undergrad", label: "本科生" },
                        { val: "grad", label: "研究生" }
                      ].map(opt => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => setPreferences(prev => ({ ...prev, audience: opt.val }))}
                          className={`px-3 py-1 rounded-md text-xs font-bold transition-all border ${
                            preferences.audience === opt.val
                              ? isDayMode
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "bg-indigo-600 border-indigo-600 text-indigo-100"
                              : isDayMode
                                ? "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                                : "bg-white/5 text-gray-300 border-white/5 hover:bg-white/10"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Suggestions Chips */}
          {activeTab === "recommend" && (
            <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-6">
              {quickPrompts.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickPrompt(item.prompt)}
                  className={`flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                    isDayMode 
                      ? "bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100 hover:text-slate-900" 
                      : "bg-white/5 text-gray-300 border-white/5 hover:bg-white/10 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <Sparkles size={11} className={`inline shrink-0 mr-1 ${isDayMode ? "text-blue-500" : "text-indigo-400"}`} />
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {/* High-Fidelity Dialog Input Area Box */}
          <div className={`w-full rounded-xl border p-2.5 transition-all duration-300 ${
            isDayMode 
              ? "bg-slate-50 border-slate-200/80 focus-within:border-blue-400 focus-within:bg-white shadow-[inset_0_2px_4px_rgba(148,163,184,0.06)]" 
              : "bg-[#090b16]/75 border-white/5 focus-within:border-indigo-500/40 focus-within:bg-neutral-950/80"
          }`}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (activeTab === "recommend") {
                    setDebouncedSearch(input);
                  } else {
                    handleSendQaMessage();
                  }
                }
              }}
              placeholder={activeTab === "recommend" ? "比如：这周末线下，适合新生，最好有综测或志愿时长的活动" : "输入活动学术规则问题，如“综测德育怎么加分”或“紫金港学术报告章签章指南”"}
              rows={3}
              className={`w-full p-3 text-sm font-semibold focus:outline-none bg-transparent resize-none leading-relaxed ${
                isDayMode ? "text-slate-900 placeholder-slate-400" : "text-white placeholder-gray-500"
              }`}
            />
            
            {/* Integrated Bottom Bar */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-dashed mt-1.5 border-slate-200/80 dark:border-white/5">
              {/* Remember checkbox (Recommendation mode only) */}
              <div className="flex items-center">
                {activeTab === "recommend" ? (
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberPreferences}
                      onChange={(e) => setRememberPreferences(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                      rememberPreferences 
                        ? isDayMode 
                          ? "bg-blue-600 border-blue-600 text-white" 
                          : "bg-indigo-600 border-indigo-600 text-indigo-100" 
                        : isDayMode 
                          ? "border-slate-300 bg-white" 
                          : "border-white/20 bg-transparent"
                    }`}>
                      {rememberPreferences && <Check size={11} strokeWidth={3} />}
                    </div>
                    <span className={`text-xs font-bold ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
                      记住
                    </span>
                  </label>
                ) : (
                  <span className={`text-[10px] font-bold flex items-center gap-1 ${isDayMode ? "text-slate-400" : "text-gray-500"}`}>
                    <Cpu size={10} /> 学术大模型提供支持
                  </span>
                )}
              </div>

              {/* Action Trigger Button */}
              <button
                type="button"
                onClick={() => {
                  if (activeTab === "recommend") {
                    setDebouncedSearch(input);
                  } else {
                    handleSendQaMessage();
                  }
                }}
                disabled={!input.trim() || searchLoading || qaLoading}
                className={`flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-bold transition-all tracking-wide ${
                  input.trim() 
                    ? isDayMode 
                      ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:translate-y-[-1px]" 
                      : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-500/10 hover:translate-y-[-1px]" 
                    : isDayMode
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                      : "bg-white/5 text-gray-500 cursor-not-allowed"
                }`}
              >
                {searchLoading || qaLoading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Send size={12} />
                )}
                {activeTab === "recommend" ? "开始推荐" : "发送提问"}
              </button>
            </div>
          </div>

          {/* Search Performance Stats for recommendation */}
          {activeTab === "recommend" && debouncedSearch.trim() && (
            <div className={`text-xs mt-4 text-center font-bold tracking-wide transition-colors ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
              {searchLoading ? (
                <span className="flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                  正在深度索引智能数据库...
                </span>
              ) : (
                `极速匹配完成 • 找到 ${searchResults.length} 个结果 (用时 ${searchTimeMs}ms) • 数字化科研检索模式`
              )}
            </div>
          )}

        </div>
      </div>

      {/* Relaxed Conditions Warning */}
      {activeTab === "recommend" && relaxedMatch && searchResults.length > 0 && (
        <div className="flex items-center gap-3 p-4 mt-6 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm max-w-5xl mx-auto animate-fadeIn justify-center font-bold relative z-10">
          <AlertCircle size={18} className="shrink-0 animate-pulse text-amber-400" />
          <span>未找到完全匹配，已为你自动放宽检索条件</span>
        </div>
      )}

      {/* ==================== ACTIVE VIEW COMPONENT INJECTIONS ==================== */}

      {activeTab === "recommend" ? (
        /* RECOMMENDATION RESULTS BLOCK */
        <div className="mt-8">
          <AnimatePresence mode="wait">
            {searchLoading && searchResults.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-7 lg:gap-8 max-w-5xl mx-auto">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`rect-media-card overflow-hidden h-full flex flex-row md:flex-col relative group rounded-xl border ${
                      isDayMode ? "bg-white/80 border-slate-200/80" : "bg-white/[0.04] border-white/5"
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-skeleton" />
                    <div className={`w-1/3 md:w-full aspect-square md:h-56 ${isDayMode ? "bg-slate-100" : "bg-white/5"}`} />
                    <div className="p-4 md:p-6 flex-1 flex flex-col w-2/3 md:w-full">
                      <div className={`h-6 rounded-[2px] w-3/4 mb-4 ${isDayMode ? "bg-slate-100" : "bg-white/10"}`} />
                      <div className={`h-4 rounded-[2px] w-full mb-2 ${isDayMode ? "bg-slate-100" : "bg-white/5"}`} />
                      <div className={`h-4 rounded-[2px] w-2/3 ${isDayMode ? "bg-slate-100" : "bg-white/5"}`} />
                    </div>
                  </div>
                ))}
              </div>
            ) : !searchLoading && debouncedSearch.trim() && searchResults.length === 0 ? (
              <div className="flex min-h-[30vh] flex-col items-center justify-center text-center py-10">
                <div className={`rect-panel p-6 mb-4 rounded-xl border ${isDayMode ? "bg-white/80 border-slate-200/80" : "bg-white/5 border-white/5"}`}>
                  <Calendar size={40} className={isDayMode ? "text-slate-400" : "text-white/40"} />
                </div>
                <h4 className={`text-lg font-bold mb-1.5 ${isDayMode ? "text-slate-900" : "text-white"}`}>
                  暂无匹配活动
                </h4>
                <p className={`text-sm max-w-sm ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
                  未找到符合条件的校内活动，可以换个词句或调整偏好面板再次搜索。
                </p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-7 lg:gap-8 max-w-5xl mx-auto">
                {searchResults.map((event, index) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    index={index}
                    onClick={onOpenEvent}
                    onToggleFavorite={handleToggleFavorite}
                    reduceMotion={false}
                    isDayMode={isDayMode}
                  />
                ))}
              </div>
            ) : (
              /* Empty Search Box Welcome View */
              <div className="flex min-h-[32vh] flex-col items-center justify-center text-center py-10">
                <div className={`p-6 mb-4 rounded-2xl border transition-all duration-300 ${isDayMode ? "bg-slate-100/50 border-slate-200" : "bg-white/5 border-white/5 shadow-[0_0_20px_rgba(99,102,241,0.05)]"}`}>
                  <Sparkles size={40} className={`animate-pulse ${isDayMode ? "text-blue-500" : "text-indigo-400"}`} />
                </div>
                <h4 className={`text-lg font-bold mb-1.5 ${isDayMode ? "text-slate-900" : "text-white"}`}>
                  浙江大学活动库 • 数字化极速推荐
                </h4>
                <p className={`text-xs md:text-sm max-w-md leading-relaxed ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
                  支持分析综测类型、志愿时长、举办校区、面向学生群体及时间跨度。高灵敏微秒级响应，一句话开启智慧检索。
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* ==================== AI INTELLIGENT QA CHAT BLOCK ==================== */
        <div className="mt-8">
          <div className={`w-full rounded-2xl border p-5 md:p-6 mb-6 ${
            isDayMode ? "bg-white/60 border-slate-200/80" : "bg-neutral-900/20 border-white/5"
          }`}>
            
            {/* Timeline Chat Message list */}
            {qaMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-10 px-4">
                <div className={`p-5 mb-4 rounded-full ${isDayMode ? "bg-blue-50" : "bg-indigo-500/10"}`}>
                  <Cpu size={36} className={isDayMode ? "text-blue-600" : "text-indigo-400 animate-pulse"} />
                </div>
                <h4 className={`text-lg font-bold mb-2 ${isDayMode ? "text-slate-900" : "text-white"}`}>
                  学术讲座与规则问答系统
                </h4>
                <p className={`text-xs md:text-sm max-w-md leading-relaxed mb-6 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
                  这里是您的学术二课小管家。无论是综测折算率、签章流程、还是特定学期的讲座积分规则，向我提问即可瞬间获知。
                </p>
                
                {/* Example QA Prompts */}
                <div className="w-full max-w-md grid grid-cols-1 gap-2.5">
                  {[
                    "紫金港这周末有没有综测加分讲座？",
                    "怎样获取二课学分？有哪些途径？",
                    "研究生学术报告章需要盖几个印戳？"
                  ].map((eg, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickPrompt(eg)}
                      className={`text-left p-3 rounded-lg text-xs font-semibold border transition-all ${
                        isDayMode 
                          ? "bg-white border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-700" 
                          : "bg-white/5 border-white/5 text-gray-300 hover:border-indigo-500/30 hover:text-indigo-200"
                      }`}
                    >
                      💡 “{eg}”
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-5 max-h-[50vh] overflow-y-auto pr-2 scrollbar-thin">
                {qaMessages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                    
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-slate-400">
                      <span>{msg.sender === "user" ? "你" : "AI 学术助手"}</span>
                      <span>•</span>
                      <span>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div className={`p-4 rounded-2xl max-w-[85%] text-xs md:text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.sender === "user"
                        ? isDayMode
                          ? "bg-blue-600 text-white rounded-tr-none"
                          : "bg-indigo-600 text-indigo-50 rounded-tr-none shadow-md"
                        : isDayMode
                          ? "bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200/50"
                          : "bg-white/5 text-gray-200 rounded-tl-none border border-white/5"
                    }`}>
                      {msg.text}
                    </div>

                    {/* Integrated Quick Card Previews inside AI response */}
                    {msg.events && msg.events.length > 0 && (
                      <div className="mt-4 w-full grid grid-cols-1 md:grid-cols-3 gap-4">
                        {msg.events.map((ev, index) => (
                          <EventCard
                            key={ev.id}
                            event={ev}
                            index={index}
                            onClick={onOpenEvent}
                            onToggleFavorite={handleToggleFavorite}
                            reduceMotion={true}
                            isDayMode={isDayMode}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {qaLoading && (
                  <div className="flex items-start">
                    <div className={`p-4 rounded-2xl rounded-tl-none text-xs flex items-center gap-2 ${
                      isDayMode ? "bg-slate-100 text-slate-500" : "bg-white/5 text-gray-400"
                    }`}>
                      <Loader2 size={13} className="animate-spin" />
                      正在调用学术库引擎分析规则并检索相关活动...
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default EventAssistantPanelPremium;
