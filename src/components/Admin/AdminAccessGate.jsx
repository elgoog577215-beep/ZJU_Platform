import React, { useState } from "react";
import {
  AlertCircle,
  Home,
  Loader2,
  LogIn,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";

const AdminAccessGate = () => {
  const { t } = useTranslation();
  const { user, loading, login, logout } = useAuth();
  const { uiMode } = useSettings();
  const [username, setUsername] = useState("123");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isDayMode = uiMode === "day";

  const shellClass = isDayMode
    ? "theme-admin-shell text-slate-950"
    : "bg-black text-white";
  const panelClass = isDayMode
    ? "border-slate-200/80 bg-white/[0.9] shadow-[0_18px_48px_rgba(15,23,42,0.1)]"
    : "border-white/10 bg-white/[0.055] shadow-[0_18px_48px_rgba(0,0,0,0.42)]";
  const mutedClass = isDayMode ? "text-slate-500" : "text-gray-400";
  const inputClass =
    "theme-admin-input rect-field min-h-[44px] px-3 py-2.5 text-sm";
  const buttonClass =
    "rect-button inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";
  const primaryButtonClass = isDayMode
    ? "rect-button-primary bg-violet-600 text-white hover:bg-violet-700"
    : "rect-button-primary bg-indigo-500 text-white hover:bg-indigo-400";
  const subtleButtonClass = isDayMode
    ? "rect-button-secondary bg-white text-slate-700 hover:text-slate-950"
    : "rect-button-secondary text-gray-200 hover:text-white";

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextUsername = username.trim();
    if (!nextUsername || !password) {
      setError(t("admin.login.empty_credentials", "请填写管理员账号和密码。"));
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const ok = await login(nextUsername, password);
      if (!ok) {
        setError(t("admin.login.failed", "登录失败，请确认账号密码，或检查本地后端服务是否已启动。"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderLoading = () => (
    <div className="flex flex-col items-center gap-3 text-center">
      <Loader2 size={24} className="animate-spin" />
      <div className={`text-sm ${mutedClass}`}>
        {t("admin.login.checking", "正在确认管理员身份...")}
      </div>
    </div>
  );

  const renderNoPermission = () => (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center border ${
            isDayMode
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-amber-400/20 bg-amber-400/10 text-amber-200"
          }`}
        >
          <AlertCircle size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">
            {t("admin.login.no_permission_title", "无管理员权限")}
          </h1>
          <p className={`mt-2 text-sm ${mutedClass}`}>
            {t("admin.login.no_permission_desc", "当前账号{{username}}不是管理员账号，请退出后使用管理员账号登录。", {
              username: user?.username ? `“${user.username}”` : "",
            })}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          className={`${buttonClass} ${primaryButtonClass}`}
          onClick={logout}
        >
          <LogOut size={16} />
          {t("admin.login.logout_current", "退出当前账号")}
        </button>
        <Link className={`${buttonClass} ${subtleButtonClass}`} to="/">
          <Home size={16} />
          {t("admin.login.back", "返回首页")}
        </Link>
      </div>
    </div>
  );

  const renderLogin = () => (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center border ${
            isDayMode
              ? "border-indigo-200 bg-indigo-50 text-indigo-700"
              : "border-indigo-400/20 bg-indigo-400/10 text-indigo-200"
          }`}
        >
          <ShieldCheck size={22} />
        </div>
        <div>
          <p
            className={`text-xs font-semibold uppercase tracking-[0.2em] ${mutedClass}`}
          >
            Operations Console
          </p>
          <h1 className="mt-2 text-2xl font-bold">
            {t("admin.login.title", "管理员登录")}
          </h1>
          <p className={`mt-2 text-sm ${mutedClass}`}>
            {t("admin.login.subtitle", "登录后继续管理内容、审核、社区和系统配置。")}
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        <label className="grid gap-2 text-sm font-semibold">
          <span className={mutedClass}>{t("admin.login.username", "账号")}</span>
          <input
            className={inputClass}
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              setError("");
            }}
            autoComplete="username"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold">
          <span className={mutedClass}>{t("admin.login.password", "密码")}</span>
          <input
            type="password"
            className={inputClass}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError("");
            }}
            placeholder={t("admin.login.password_placeholder", "默认密码 123456")}
            autoComplete="current-password"
          />
        </label>
      </div>

      {error ? (
        <div
          className={`border px-3 py-2 text-sm ${
            isDayMode
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-rose-400/20 bg-rose-400/10 text-rose-200"
          }`}
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        className={`${buttonClass} ${primaryButtonClass} w-full`}
        disabled={submitting}
      >
        {submitting ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <LogIn size={16} />
        )}
        {t("admin.login.enter_dashboard", "进入管理员后台")}
      </button>
    </form>
  );

  return (
    <div
      className={`min-h-screen px-4 py-[calc(env(safe-area-inset-top)+72px)] ${shellClass}`}
    >
      <div className="mx-auto flex min-h-[calc(100dvh-144px)] max-w-lg items-center justify-center">
        <section
          className={`w-full border p-6 md:p-8 ${panelClass}`}
        >
          {loading
            ? renderLoading()
            : user && user.role !== "admin"
              ? renderNoPermission()
              : renderLogin()}
        </section>
      </div>
    </div>
  );
};

export default AdminAccessGate;
