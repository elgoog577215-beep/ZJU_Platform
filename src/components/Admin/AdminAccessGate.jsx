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

import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";

const AdminAccessGate = () => {
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
    ? "border-slate-200/80 bg-white/[0.86] shadow-[0_24px_80px_rgba(15,23,42,0.12)]"
    : "border-white/10 bg-white/[0.06] shadow-[0_24px_80px_rgba(0,0,0,0.5)]";
  const mutedClass = isDayMode ? "text-slate-500" : "text-gray-400";
  const inputClass =
    "theme-admin-input min-h-[44px] rounded-xl px-3 py-2.5 text-sm";
  const buttonClass =
    "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";
  const primaryButtonClass = isDayMode
    ? "bg-slate-950 text-white hover:bg-slate-800"
    : "bg-white text-slate-950 hover:bg-gray-100";
  const subtleButtonClass = isDayMode
    ? "border border-slate-200 bg-white text-slate-700 hover:text-slate-950"
    : "border border-white/10 bg-white/5 text-gray-200 hover:bg-white/10 hover:text-white";

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextUsername = username.trim();
    if (!nextUsername || !password) {
      setError("请填写管理员账号和密码。");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const ok = await login(nextUsername, password);
      if (!ok) {
        setError("登录失败，请确认账号密码，或检查本地后端服务是否已启动。");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderLoading = () => (
    <div className="flex flex-col items-center gap-3 text-center">
      <Loader2 size={24} className="animate-spin" />
      <div className={`text-sm ${mutedClass}`}>正在确认管理员身份...</div>
    </div>
  );

  const renderNoPermission = () => (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            isDayMode
              ? "bg-amber-50 text-amber-700"
              : "bg-amber-400/10 text-amber-200"
          }`}
        >
          <AlertCircle size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">无管理员权限</h1>
          <p className={`mt-2 text-sm ${mutedClass}`}>
            当前账号 {user?.username ? `“${user.username}”` : ""}
            不是管理员账号，请退出后使用管理员账号登录。
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
          退出当前账号
        </button>
        <Link className={`${buttonClass} ${subtleButtonClass}`} to="/">
          <Home size={16} />
          返回首页
        </Link>
      </div>
    </div>
  );

  const renderLogin = () => (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            isDayMode
              ? "bg-indigo-50 text-indigo-700"
              : "bg-indigo-400/10 text-indigo-200"
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
          <h1 className="mt-2 text-2xl font-bold">管理员登录</h1>
          <p className={`mt-2 text-sm ${mutedClass}`}>
            登录后继续管理内容、审核、社区和系统配置。
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        <label className="grid gap-2 text-sm font-semibold">
          <span className={mutedClass}>账号</span>
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
          <span className={mutedClass}>密码</span>
          <input
            type="password"
            className={inputClass}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError("");
            }}
            placeholder="默认密码 123456"
            autoComplete="current-password"
          />
        </label>
      </div>

      {error ? (
        <div
          className={`rounded-xl border px-3 py-2 text-sm ${
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
        进入管理员后台
      </button>
    </form>
  );

  return (
    <div
      className={`min-h-screen px-4 py-[calc(env(safe-area-inset-top)+72px)] ${shellClass}`}
    >
      <div className="mx-auto flex min-h-[calc(100dvh-144px)] max-w-lg items-center justify-center">
        <section
          className={`w-full rounded-3xl border p-6 backdrop-blur md:p-8 ${panelClass}`}
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
