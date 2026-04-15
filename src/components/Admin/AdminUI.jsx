import React from "react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";

export const statusMeta = {
  approved: {
    label: "已通过",
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  },
  pending: {
    label: "待审核",
    className: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  },
  rejected: {
    label: "已驳回",
    className: "border-red-500/20 bg-red-500/10 text-red-300",
  },
  deleted: {
    label: "已删除",
    className: "border-slate-500/20 bg-slate-500/10 text-slate-300",
  },
  published: {
    label: "已发布",
    className: "border-sky-500/20 bg-sky-500/10 text-sky-300",
  },
  open: {
    label: "进行中",
    className: "border-sky-500/20 bg-sky-500/10 text-sky-300",
  },
  solved: {
    label: "已解决",
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  },
  recruiting: {
    label: "招募中",
    className: "border-violet-500/20 bg-violet-500/10 text-violet-300",
  },
  full: {
    label: "已满员",
    className: "border-orange-500/20 bg-orange-500/10 text-orange-300",
  },
  closed: {
    label: "已关闭",
    className: "border-slate-500/20 bg-slate-500/10 text-slate-300",
  },
};

export const AdminPageShell = ({
  title,
  description,
  actions,
  toolbar,
  children,
}) => (
  <div className="space-y-4 md:space-y-6">
    <div className="rounded-3xl border border-white/10 bg-[#111] p-4 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white">{title}</h2>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm text-gray-400">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {toolbar ? <div className="mt-4">{toolbar}</div> : null}
    </div>
    {children}
  </div>
);

export const AdminPanel = ({
  title,
  description,
  action,
  children,
  className,
}) => (
  <section
    className={clsx(
      "rounded-3xl border border-white/10 bg-[#111] p-4 md:p-6",
      className,
    )}
  >
    {(title || action) && (
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {title ? <h3 className="text-lg font-bold text-white">{title}</h3> : null}
          {description ? (
            <p className="mt-1 text-sm text-gray-400">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
    )}
    {children}
  </section>
);

export const AdminLoadingState = ({ text = "正在加载..." }) => (
  <div className="rounded-3xl border border-white/10 bg-[#111] p-10 text-center text-sm text-gray-400">
    {text}
  </div>
);

export const AdminEmptyState = ({
  icon: Icon,
  title,
  description,
  action,
}) => (
  <div className="rounded-3xl border border-dashed border-white/10 bg-[#111] p-10 text-center">
    {Icon ? (
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-gray-500">
        <Icon size={26} />
      </div>
    ) : null}
    <h3 className="text-base font-semibold text-white">{title}</h3>
    {description ? <p className="mt-2 text-sm text-gray-400">{description}</p> : null}
    {action ? <div className="mt-5">{action}</div> : null}
  </div>
);

export const AdminToolbar = ({ children }) => (
  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
    {children}
  </div>
);

export const ToolbarGroup = ({ children, className }) => (
  <div className={clsx("flex flex-wrap items-center gap-2", className)}>{children}</div>
);

export const FilterChip = ({ active, children, ...props }) => (
  <button
    {...props}
    className={clsx(
      "rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
      active
        ? "border-indigo-500 bg-indigo-600 text-white"
        : "border-white/10 bg-white/5 text-gray-300 hover:border-white/20 hover:text-white",
      props.className,
    )}
  >
    {children}
  </button>
);

export const AdminButton = ({
  tone = "default",
  children,
  className,
  ...props
}) => {
  const toneClassName = {
    default:
      "border border-white/10 bg-white/5 text-white hover:bg-white/10",
    primary:
      "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20",
    success:
      "bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-500/20",
    danger:
      "bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-500/20",
    subtle:
      "border border-white/10 bg-transparent text-gray-300 hover:bg-white/5 hover:text-white",
  }[tone];

  return (
    <button
      {...props}
      className={clsx(
        "inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        toneClassName,
        className,
      )}
    >
      {children}
    </button>
  );
};

export const StatusBadge = ({ status, label }) => {
  const meta = statusMeta[status] || {
    label: label || status || "未知",
    className: "border-white/10 bg-white/5 text-gray-300",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        meta.className,
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
}) => (
  <AnimatePresence>
    {open ? (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm md:items-center md:p-4"
        onClick={onCancel}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="w-full max-w-md rounded-t-3xl border border-white/10 bg-[#111] p-6 pb-[calc(env(safe-area-inset-bottom)+24px)] shadow-2xl md:rounded-3xl md:pb-6"
          onClick={(event) => event.stopPropagation()}
        >
          <h3 className="text-xl font-bold text-white">{title}</h3>
          {description ? <p className="mt-2 text-sm text-gray-400">{description}</p> : null}
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
