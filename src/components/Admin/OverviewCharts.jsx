import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import api from "../../services/api";
import { AdminButton, AdminInlineNote, AdminPanel, useAdminTheme } from "./AdminUI";

const COLORS = ["#818cf8", "#38bdf8", "#34d399", "#fbbf24", "#fb7185"];
const SERIES = ["views", "visitors", "eventViews", "registrations"];

export function VisitTrends({ refreshKey }) {
    const { t, i18n } = useTranslation();
    const { isDayMode } = useAdminTheme();
    const [days, setDays] = useState(30);
    const [hidden, setHidden] = useState([]);
    const [metrics, setMetrics] = useState(null);
    const [error, setError] = useState(false);
    const [retry, setRetry] = useState(0);
    useEffect(() => {
        let active = true;
        setMetrics(null);
        setError(false);
        api.get(`/site-metrics?days=${days}`)
            .then(({ data }) => {
                if (active) setMetrics(data);
            })
            .catch(() => {
                if (active) setError(true);
            });
        return () => {
            active = false;
        };
    }, [days, refreshKey, retry]);
    const number = (value) => new Intl.NumberFormat(i18n.language).format(Number(value || 0));
    const data = metrics?.trend || [];
    const toggle = (key) =>
        setHidden((previous) =>
            previous.includes(key)
                ? previous.filter((item) => item !== key)
                : previous.length < SERIES.length - 1
                  ? [...previous, key]
                  : previous
        );
    return (
        <AdminPanel
            title={t("admin.charts.trend_title")}
            description={t("admin.charts.trend_help")}
            action={
                <div className="flex gap-2">
                    {[7, 30].map((value) => (
                        <AdminButton
                            key={value}
                            tone={days === value ? "primary" : "subtle"}
                            aria-pressed={days === value}
                            onClick={() => setDays(value)}
                        >
                            {t("admin.charts.days", { count: value })}
                        </AdminButton>
                    ))}
                </div>
            }
        >
            {error ? (
                <AdminInlineNote>
                    <span role="alert">{t("admin.charts.load_error")}</span>{" "}
                    <AdminButton onClick={() => setRetry((value) => value + 1)}>
                        {t("admin.overview_ui.refresh")}
                    </AdminButton>
                </AdminInlineNote>
            ) : !metrics ? (
                <p role="status">{t("admin.overview_ui.loading_stats")}</p>
            ) : (
                <>
                    <dl className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
                        {["todayViews", "todayVisitors", "todayUploads", "totalVisitors"].map(
                            (key) => (
                                <div key={key}>
                                    <dt className="text-xs text-[var(--theme-text-muted)]">
                                        {t(`admin.charts.${key}`)}
                                    </dt>
                                    <dd className="mt-1 text-xl font-semibold tabular-nums">
                                        {number(metrics.summary?.[key])}
                                    </dd>
                                </div>
                            )
                        )}
                    </dl>
                    <div className="mb-3 flex flex-wrap gap-2">
                        {SERIES.map((key, index) => (
                            <button
                                key={key}
                                type="button"
                                aria-pressed={!hidden.includes(key)}
                                onClick={() => toggle(key)}
                                className={`min-h-11 rounded-lg border border-[var(--theme-border)] px-3 text-xs ${hidden.includes(key) ? "opacity-50 line-through" : ""}`}
                            >
                                <span style={{ color: COLORS[index] }}>● </span>
                                {t(`admin.charts.${key}`)}{" "}
                                {number(
                                    data.reduce((sum, item) => sum + Number(item[key] || 0), 0)
                                )}
                            </button>
                        ))}
                    </div>
                    <p className="mb-2 text-xs text-[var(--theme-text-muted)]">
                        {t("admin.charts.growth", {
                            count: days,
                            value: metrics.growth?.viewsChange ?? 0,
                        })}
                    </p>
                    <div className="h-64 min-w-0" aria-label={t("admin.charts.trend_title")}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data} accessibilityLayer>
                                <CartesianGrid vertical={false} stroke="var(--theme-border)" />
                                <XAxis
                                    dataKey="label"
                                    tick={{ fill: "var(--theme-text-muted)", fontSize: 11 }}
                                    interval="preserveStartEnd"
                                />
                                <YAxis
                                    width={42}
                                    allowDecimals={false}
                                    tick={{ fill: "var(--theme-text-muted)", fontSize: 11 }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: isDayMode ? "#fff" : "#0f172a",
                                        borderColor: "var(--theme-border)",
                                        color: "var(--theme-text-primary)",
                                    }}
                                />
                                {SERIES.map((key, index) => (
                                    <Area
                                        key={key}
                                        dataKey={key}
                                        name={t(`admin.charts.${key}`)}
                                        stroke={COLORS[index]}
                                        fill={COLORS[index]}
                                        fillOpacity={key === "views" ? 0.12 : 0}
                                        hide={hidden.includes(key)}
                                        isAnimationActive={false}
                                    />
                                ))}
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </>
            )}
        </AdminPanel>
    );
}

export function ContentComposition({ counts }) {
    const { t } = useTranslation();
    const data = Object.entries(counts)
        .filter(([, value]) => Number(value) > 0)
        .map(([key, value]) => ({
            name: t(`admin.tabs.${key}`, { defaultValue: key }),
            value: Number(value),
        }));
    if (!data.length) return null;
    return (
        <div className="h-48 min-w-0" aria-label={t("admin.charts.composition")}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="50%"
                        outerRadius="80%"
                        isAnimationActive={false}
                    >
                        {data.map((item, i) => (
                            <Cell key={item.name} fill={COLORS[i % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            background: "var(--theme-surface-strong)",
                            borderColor: "var(--theme-border)",
                            color: "var(--theme-text-primary)",
                        }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

export function HotEventsChart({ events }) {
    const { t } = useTranslation();
    if (!events.length) return null;
    return (
        <div className="mb-3 h-56 min-w-0" aria-label={t("admin.charts.hot_events")}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={events.slice(0, 5)} layout="vertical" accessibilityLayer>
                    <CartesianGrid horizontal={false} stroke="var(--theme-border)" />
                    <XAxis
                        type="number"
                        tick={{ fill: "var(--theme-text-muted)", fontSize: 11 }}
                        allowDecimals={false}
                    />
                    <YAxis
                        type="category"
                        dataKey="title"
                        width={100}
                        tickFormatter={(text) => (text.length > 7 ? `${text.slice(0, 7)}…` : text)}
                        tick={{ fill: "var(--theme-text-muted)", fontSize: 11 }}
                    />
                    <Tooltip
                        contentStyle={{
                            background: "var(--theme-surface-strong)",
                            borderColor: "var(--theme-border)",
                            color: "var(--theme-text-primary)",
                        }}
                    />
                    <Legend />
                    <Bar
                        dataKey="views"
                        name={t("admin.charts.eventViews")}
                        fill={COLORS[2]}
                        isAnimationActive={false}
                        maxBarSize={18}
                    />
                    <Bar
                        dataKey="registrations"
                        name={t("admin.charts.registrations")}
                        fill={COLORS[3]}
                        maxBarSize={18}
                        isAnimationActive={false}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
