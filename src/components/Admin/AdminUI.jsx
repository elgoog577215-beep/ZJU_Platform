import React from "react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";

import { useSettings } from "../../context/SettingsContext";

export const statusMeta = {
  approved: {
    label: "已通过",
    tone: "success",
  },
  pending: {
    label: "待审核",
    tone: "warning",
  },
  rejected: {
    label: "已驳回",
    tone: "danger",
  },
  deleted: {
    label: "已删除",
    tone: "muted",
  },
  published: {
    label: "已发布",
    tone: "info",
  },
  open: {
    label: "进行中",
    tone: "info",
  },
  solved: {
    label: "已解决",
    tone: "success",
  },
  recruiting: {
    label: "招募中",
    tone: "violet",
  },
  full: {
    label: "已满员",
    tone: "warning",
  },
  closed: {
    label: "已关闭",
    tone: "muted",
  },
};

const useAdminTheme = () => {
  const { uiMode } = useSettings();
  const isDayMode = uiMode === "day";

  return {
    isDayMode,
    panelClass: "theme-admin-panel",
    softPanelClass: "theme-admin-panel-soft",
    mutedTextClass: isDayMode ? "text-slate-500" : "text-gray-400",
    subtleTextClass: isDayMode ? "text-slate-600" : "text-gray-300",
    iconWrapClass: isDayMode
      ? "bg-slate-100 text-slate-500"
      : "bg-white/5 text-gray-500",
    filterChipClass: isDayMode
      ? "theme-chip hover:border-indigo-200/80 hover:text-slate-950"
      : "theme-chip hover:border-white/20 hover:text-white",
    dialogBackdropClass: isDayMode ? "theme-overlay-backdrop" : "bg-black/80",
    dialogPanelClass: isDayMode ? "theme-dialog" : "bg-[#111] border border-white/10 shadow-2xl",
    statusToneMap: {
      success: isDayMode
        ? "border-emerald-500/20 bg-emerald-500/8 text-emerald-700"
        : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
      warning: isDayMode
        ? "border-amber-500/20 bg-amber-500/10 text-amber-700"
        : "border-amber-500/20 bg-amber-500/10 text-amber-300",
      danger: isDayMode
        ? "border-rose-500/18 bg-rose-500/10 text-rose-700"
        : "border-red-500/20 bg-red-500/10 text-red-300",
      info: isDayMode
        ? "border-sky-500/18 bg-sky-500/10 text-sky-700"
        : "border-sky-500/20 bg-sky-500/10 text-sky-300",
      violet: isDayMode
        ? "border-violet-500/18 bg-violet-500/10 text-violet-700"
        : "border-violet-500/20 bg-violet-500/10 text-violet-300",
      muted: isDayMode
        ? "border-slate-400/16 bg-slate-500/8 text-slate-600"
        : "border-slate-500/20 bg-slate-500/10 text-slate-300",
    },
  };
};

export const AdminPageShell = ({
  title,
  description,
  actions,
  toolbar,
  children,
}) => {
  const { panelClass, mutedTextClass, subtleTextClass, isDayMode } =
    useAdminTheme();

  return (
    <div className="space-y-4 md:space-y-6">
      <div className={clsx("rounded-[28px] p-4 md:p-6", panelClass)}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2
              className={clsx(
                "text-xl font-bold md:text-2xl",
                isDayMode ? "text-slate-950" : "text-white",
              )}
              style={isDayMode ? { fontFamily: "var(--theme-font-display)" } : undefined}
            >
              {title}
            </h2>
            {description ? (
              <p className={clsx("mt-2 max-w-3xl text-sm", mutedTextClass)}>
                {description}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className={clsx("flex flex-wrap items-center gap-2", subtleTextClass)}>
              {actions}
            </div>
          ) : null}
        </div>
        {toolbar ? <div className="mt-4">{toolbar}</div> : null}
      </div>
      {children}
    </div>
  );
};

export const AdminPanel = ({
  title,
  description,
  action,
  children,
  className,
}) => {
  const { panelClass, mutedTextClass, isDayMode } = useAdminTheme();

  return (
    <section
      className={clsx("rounded-[28px] p-4 md:p-6", panelClass, className)}
    >
      {(title || action) && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title ? (
              <h3
                className={clsx(
                  "text-lg font-bold",
                  isDayMode ? "text-slate-950" : "text-white",
                )}
              >
                {title}
              </h3>
            ) : null}
            {description ? (
              <p className={clsx("mt-1 text-sm", mutedTextClass)}>
                {description}
              </p>
            ) : null}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
};

export const AdminLoadingState = ({ text = "正在加载..." }) => {
  const { panelClass, mutedTextClass } = useAdminTheme();

  return (
    <div
      className={clsx(
        "rounded-[28px] p-10 text-center text-sm",
        panelClass,
        mutedTextClass,
      )}
    >
      {text}
    </div>
  );
};

export const AdminEmptyState = ({
  icon: Icon,
  title,
  description,
  action,
}) => {
  const { panelClass, iconWrapClass, mutedTextClass, isDayMode } =
    useAdminTheme();

  return (
    <div
      className={clsx(
        "rounded-[28px] border border-dashed p-10 text-center",
        panelClass,
      )}
    >
      {Icon ? (
        <div
          className={clsx(
            "mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl",
            iconWrapClass,
          )}
        >
          <Icon size={26} />
        </div>
      ) : null}
      <h3
        className={clsx(
          "text-base font-semibold",
          isDayMode ? "text-slate-950" : "text-white",
        )}
      >
        {title}
      </h3>
      {description ? (
        <p className={clsx("mt-2 text-sm", mutedTextClass)}>{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
};

export const AdminToolbar = ({ children }) => (
  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
    {children}
  </div>
);

export const ToolbarGroup = ({ children, className }) => (
  <div className={clsx("flex flex-wrap items-center gap-2", className)}>
    {children}
  </div>
);

export const FilterChip = ({ active, children, ...props }) => {
  const { filterChipClass } = useAdminTheme();

  return (
    <button
      {...props}
      className={clsx(
        "rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
        active ? "theme-chip-active" : filterChipClass,
        props.className,
      )}
    >
      {children}
    </button>
  );
};

export const AdminButton = ({
  tone = "default",
  children,
  className,
  ...props
}) => {
  const { isDayMode } = useAdminTheme();
  const toneClassName = {
    default: "theme-button-secondary",
    primary: "theme-button-primary",
    success:
      "bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-500/20",
    danger:
      "bg-rose-600 text-white hover:bg-rose-500 shadow-lg shadow-rose-500/20",
    subtle: isDayMode
      ? "theme-button-ghost border border-[rgba(128,146,167,0.14)]"
      : "theme-button-ghost border border-white/10",
  }[tone];

  return (
    <button
      {...props}
      className={clsx(
        "inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
        toneClassName,
        className,
      )}
    >
      {children}
    </button>
  );
};

export const StatusBadge = ({ status, label }) => {
  const { statusToneMap } = useAdminTheme();
  const meta = statusMeta[status] || {
    label: label || status || "未知",
    tone: "muted",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        statusToneMap[meta.tone] || statusToneMap.muted,
      )}
    >
      {label || meta.label}
    </span>
  );
};

export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmText = "确认",
  cancelText = "取消",
  tone = "danger",
  pending = false,
  onConfirm,
  onCancel,
  children,
}) => {
  const { dialogBackdropClass, dialogPanelClass, mutedTextClass, isDayMode } =
    useAdminTheme();

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={clsx(
            "fixed inset-0 z-[110] flex items-end justify-center p-0 backdrop-blur-sm md:items-center md:p-4",
            dialogBackdropClass,
          )}
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            className={clsx(
              "w-full max-w-md rounded-t-3xl p-6 pb-[calc(env(safe-area-inset-bottom)+24px)] md:rounded-3xl md:pb-6",
              dialogPanelClass,
            )}
            onClick={(event) => event.stopPropagation()}
          >
            <h3
              className={clsx(
                "text-xl font-bold",
                isDayMode ? "text-slate-950" : "text-white",
              )}
            >
              {title}
            </h3>
            {description ? (
              <p className={clsx("mt-2 text-sm", mutedTextClass)}>
                {description}
              </p>
            ) : null}
            {children ? <div className="mt-4">{children}</div> : null}
            <div className="mt-6 flex gap-3">
              <AdminButton tone="subtle" className="flex-1" onClick={onCancel}>
                {cancelText}
              </AdminButton>
              <AdminButton
                tone={tone}
                className="flex-1"
                disabled={pending}
                onClick={onConfirm}
              >
                {pending ? "处理中..." : confirmText}
              </AdminButton>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
