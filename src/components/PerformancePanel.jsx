import React, { useEffect, useMemo, useState } from "react";
import { Activity, Clock, Monitor, Wifi, X, Zap } from "lucide-react";
import { motion } from "framer-motion";
import performanceMonitor, {
  performanceDebugStorageKey,
} from "../utils/performanceMonitor";

const statusClassMap = {
  good: "text-emerald-400 border-emerald-400/20 bg-emerald-400/10",
  moderate: "text-amber-400 border-amber-400/20 bg-amber-400/10",
  poor: "text-rose-400 border-rose-400/20 bg-rose-400/10",
};

const getMetricStatus = (value, good, moderate) => {
  if (value == null) {
    return "moderate";
  }
  if (value <= good) {
    return "good";
  }
  if (value <= moderate) {
    return "moderate";
  }
  return "poor";
};

const formatMs = (value) => (value == null ? "N/A" : `${value.toFixed(0)} ms`);
const formatSeconds = (value) =>
  value == null ? "N/A" : `${(value / 1000).toFixed(2)} s`;

const PerformancePanel = () => {
  const [isDebugEnabled, setIsDebugEnabled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [metrics, setMetrics] = useState(() => performanceMonitor.getMetrics());

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const enabled =
      window.localStorage.getItem(performanceDebugStorageKey) === "true";
    setIsDebugEnabled(enabled);
  }, []);

  useEffect(() => {
    if (!isDebugEnabled || !isOpen) {
      return undefined;
    }

    performanceMonitor.init();
    const intervalId = window.setInterval(() => {
      setMetrics(performanceMonitor.getMetrics());
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [isDebugEnabled, isOpen]);

  const metricCards = useMemo(
    () => [
      {
        label: "FCP",
        icon: Zap,
        value: formatSeconds(metrics.fcp),
        status: getMetricStatus(metrics.fcp, 1800, 3000),
      },
      {
        label: "LCP",
        icon: Clock,
        value: formatSeconds(metrics.lcp),
        status: getMetricStatus(metrics.lcp, 2500, 4000),
      },
      {
        label: "FID",
        icon: Activity,
        value: formatMs(metrics.fid),
        status: getMetricStatus(metrics.fid, 100, 300),
      },
      {
        label: "CLS",
        icon: Monitor,
        value: metrics.cls?.toFixed(3) || "0.000",
        status: getMetricStatus(metrics.cls || 0, 0.1, 0.25),
      },
    ],
    [metrics],
  );

  if (!isDebugEnabled) {
    return null;
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => {
          performanceMonitor.init();
          setMetrics(performanceMonitor.getMetrics());
          setIsOpen(true);
        }}
        className="fixed bottom-4 right-4 z-50 rounded-full border border-slate-700 bg-slate-950/90 p-3 text-indigo-300 shadow-2xl backdrop-blur"
        title="性能调试面板"
        aria-label="打开性能调试面板"
      >
        <Activity size={18} />
      </button>
    );
  }

  return (
    <motion.aside
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="fixed bottom-4 right-4 z-50 w-80 rounded-2xl border border-slate-700 bg-slate-950/95 p-4 text-white shadow-2xl backdrop-blur"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">性能调试</div>
          <div className="text-xs text-slate-400">
            仅在本地开启 `localStorage.debugPerformance = &quot;true&quot;` 时显示
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="rounded-full p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          aria-label="关闭性能调试面板"
        >
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {metricCards.map(({ label, icon: Icon, value, status }) => (
          <div
            key={label}
            className={`rounded-xl border p-3 ${statusClassMap[status]}`}
          >
            <div className="mb-2 flex items-center justify-between">
              <Icon size={15} />
              <span className="text-[11px] uppercase tracking-[0.24em]">
                {label}
              </span>
            </div>
            <div className="text-sm font-semibold">{value}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
        <div className="flex items-center justify-between">
          <span>堆内存</span>
          <span>
            {(metrics.jsHeapUsed / 1024 / 1024).toFixed(1)} /{" "}
            {(metrics.jsHeapTotal / 1024 / 1024).toFixed(1)} MB
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>DOM 节点</span>
          <span>{metrics.domNodes || 0}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1">
            <Wifi size={13} />
            网络
          </span>
          <span>
            {metrics.connection?.effectiveType?.toUpperCase() ||
              (metrics.isOnline ? "ONLINE" : "OFFLINE")}
          </span>
        </div>
      </div>
    </motion.aside>
  );
};

export default PerformancePanel;
