import React, { useEffect, useMemo, useState } from "react";
import {
    Archive,
    ArrowDown,
    ArrowUp,
    CalendarRange,
    Copy,
    ExternalLink,
    FileText,
    ListChecks,
    Plus,
    Save,
    Settings2,
    Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

import {
    getFirstAvailableHackathonView,
    getHackathonScheduleEvent,
    normalizeHackathonSchedule,
    normalizeHackathonTemplate,
} from "../../data/hackathonTemplate";
import api from "../../services/api";
import {
    AdminButton,
    AdminIconButton,
    AdminInlineNote,
    AdminPanel,
    useAdminTheme,
} from "./AdminUI";

const FIELD_TYPE_OPTIONS = [
    { value: "text", label: "单行文本" },
    { value: "email", label: "邮箱" },
    { value: "tel", label: "手机号" },
    { value: "number", label: "数字" },
    { value: "textarea", label: "多行文本" },
    { value: "select", label: "单选下拉" },
    { value: "multi_select", label: "多选按钮" },
    { value: "checkbox", label: "确认勾选" },
];

const optionsToText = (options = []) =>
    options.map((option) => `${option.value}|${option.label}`).join("\n");

const parseOptionsText = (value = "") =>
    String(value)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, index) => {
            const separator = line.indexOf("|");
            if (separator === -1) return { value: line, label: line };
            const optionValue = line.slice(0, separator).trim() || `option_${index + 1}`;
            const label = line.slice(separator + 1).trim() || optionValue;
            return { value: optionValue, label };
        });

const toEditorDraft = (template) => {
    const normalized = normalizeHackathonTemplate(template);
    return {
        ...normalized,
        form: {
            ...normalized.form,
            fields: normalized.form.fields.map((field) => ({
                ...field,
                _optionsText: optionsToText(field.options),
            })),
        },
    };
};

const toPayload = (draft) =>
    normalizeHackathonTemplate({
        ...draft,
        form: {
            ...draft.form,
            fields: draft.form.fields.map(({ _optionsText, ...field }) => ({
                ...field,
                options: parseOptionsText(_optionsText),
            })),
        },
    });

const moveItem = (items, index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return items;
    const next = [...items];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    return next;
};

const newId = (prefix) => `${prefix}_${Date.now().toString(36)}`;

const toOutcomeSlug = (value) =>
    String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 120) || "hackathon-outcome";

const buildSchedulePayload = (schedule, selectedEventKey, draft) =>
    normalizeHackathonSchedule({
        ...schedule,
        events: schedule.events.map((item) =>
            item.event.key === selectedEventKey ? toPayload(draft) : item
        ),
    });

const HackathonTemplateEditor = ({ onTemplateChange }) => {
    const { isDayMode, mutedTextClass } = useAdminTheme();
    const [scheduleDraft, setScheduleDraft] = useState(null);
    const [selectedEventKey, setSelectedEventKey] = useState("");
    const [draft, setDraft] = useState(null);
    const [initialPayload, setInitialPayload] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [outcomeArchives, setOutcomeArchives] = useState([]);

    useEffect(() => {
        let active = true;
        Promise.all([
            api.get("/hackathon/schedule"),
            api.get("/admin/competitions").catch(() => ({ data: [] })),
        ])
            .then(([scheduleResponse, archivesResponse]) => {
                if (!active) return;
                const schedule = normalizeHackathonSchedule(scheduleResponse.data);
                const selected = getHackathonScheduleEvent(schedule, schedule.activeEventKey);
                setOutcomeArchives(
                    Array.isArray(archivesResponse.data) ? archivesResponse.data : []
                );
                setScheduleDraft(schedule);
                setSelectedEventKey(selected.event.key);
                setDraft(toEditorDraft(selected));
                setInitialPayload(JSON.stringify(schedule));
                onTemplateChange?.(selected, schedule);
            })
            .catch(() => {
                if (active) toast.error("加载浙客松模板失败");
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, [onTemplateChange]);

    const payload = useMemo(() => (draft ? toPayload(draft) : null), [draft]);
    const schedulePayload = useMemo(
        () =>
            scheduleDraft && draft
                ? buildSchedulePayload(scheduleDraft, selectedEventKey, draft)
                : null,
        [draft, scheduleDraft, selectedEventKey]
    );
    const outcomeOwnerBySlug = useMemo(
        () =>
            new Map(
                (schedulePayload?.events || []).map((item) => [
                    item.results.competitionSlug,
                    item.event.key,
                ])
            ),
        [schedulePayload]
    );
    const dirty = schedulePayload ? JSON.stringify(schedulePayload) !== initialPayload : false;

    const fieldClass = `border-b py-3 last:border-b-0 ${
        isDayMode ? "border-slate-200/70" : "border-white/10"
    }`;
    const labelClass = `mb-2 block text-xs font-semibold ${
        isDayMode ? "text-slate-600" : "text-gray-300"
    }`;
    const inputClass = "theme-admin-input w-full rounded-xl px-3 py-2.5 text-sm";

    const updateEvent = (key, value) =>
        setDraft((current) => ({
            ...current,
            event: {
                ...current.event,
                [key]: value,
                ...(["startAt", "endAt"].includes(key) ? { timeText: "" } : {}),
            },
        }));

    const updateNavigation = (key, value) =>
        setDraft((current) => ({
            ...current,
            navigation: { ...current.navigation, [key]: value },
        }));

    const updateResults = (key, value) =>
        setDraft((current) => ({
            ...current,
            results: { ...current.results, [key]: value },
        }));

    const commitCurrentDraft = () => {
        if (!scheduleDraft || !draft) return scheduleDraft;
        return buildSchedulePayload(scheduleDraft, selectedEventKey, draft);
    };

    const selectScheduleEvent = (eventKey) => {
        if (eventKey === selectedEventKey) return;
        const committed = commitCurrentDraft();
        const selected = getHackathonScheduleEvent(committed, eventKey);
        setScheduleDraft(committed);
        setSelectedEventKey(selected.event.key);
        setDraft(toEditorDraft(selected));
        onTemplateChange?.(selected, committed);
    };

    const addScheduleEvent = (duplicateCurrent = false) => {
        const committed = commitCurrentDraft();
        if (!committed || !draft) return;
        const source = toPayload(draft);
        const eventKey = newId("hackathon");
        const nextTemplate = normalizeHackathonTemplate({
            ...source,
            revision: 1,
            updatedAt: null,
            navigation: {
                registrationVisible: true,
                resultsVisible: true,
            },
            results: {
                competitionSlug: toOutcomeSlug(eventKey),
            },
            event: {
                ...source.event,
                key: eventKey,
                title: duplicateCurrent ? `${source.event.title}（副本）` : "新比赛日程",
                subtitle: duplicateCurrent ? source.event.subtitle : "请填写这一场比赛的概要",
                registrationOpen: false,
            },
        });
        const nextSchedule = normalizeHackathonSchedule({
            ...committed,
            events: [...committed.events, nextTemplate],
        });
        setScheduleDraft(nextSchedule);
        setSelectedEventKey(eventKey);
        setDraft(toEditorDraft(getHackathonScheduleEvent(nextSchedule, eventKey)));
        onTemplateChange?.(nextTemplate, nextSchedule);
    };

    const deleteScheduleEvent = () => {
        if (!scheduleDraft || scheduleDraft.events.length <= 1) {
            toast.error("至少需要保留一个比赛日程");
            return;
        }
        if (
            !window.confirm(
                `确认删除“${draft.event.title}”日程？成果档案与其中的历史内容会保留；未发布前可刷新页面撤销。`
            )
        ) {
            return;
        }
        const committed = commitCurrentDraft();
        const nextSchedule = normalizeHackathonSchedule({
            ...committed,
            events: committed.events.filter((item) => item.event.key !== selectedEventKey),
            activeEventKey:
                committed.activeEventKey === selectedEventKey
                    ? committed.events.find((item) => item.event.key !== selectedEventKey)?.event
                          .key
                    : committed.activeEventKey,
        });
        const selected = getHackathonScheduleEvent(nextSchedule, nextSchedule.activeEventKey);
        setScheduleDraft(nextSchedule);
        setSelectedEventKey(selected.event.key);
        setDraft(toEditorDraft(selected));
        onTemplateChange?.(selected, nextSchedule);
    };

    const setDefaultScheduleEvent = () => {
        setScheduleDraft((current) => ({ ...current, activeEventKey: selectedEventKey }));
    };

    const updateHighlight = (index, key, value) =>
        setDraft((current) => ({
            ...current,
            event: {
                ...current.event,
                highlights: current.event.highlights.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, [key]: value } : item
                ),
            },
        }));

    const updateRule = (index, key, value) =>
        setDraft((current) => ({
            ...current,
            rules: current.rules.map((rule, ruleIndex) =>
                ruleIndex === index ? { ...rule, [key]: value } : rule
            ),
        }));

    const updateForm = (key, value) =>
        setDraft((current) => ({
            ...current,
            form: { ...current.form, [key]: value },
        }));

    const updateField = (index, key, value) =>
        setDraft((current) => ({
            ...current,
            form: {
                ...current.form,
                fields: current.form.fields.map((field, fieldIndex) =>
                    fieldIndex === index ? { ...field, [key]: value } : field
                ),
            },
        }));

    const addRule = () =>
        setDraft((current) => ({
            ...current,
            rules: [
                ...current.rules,
                {
                    id: newId("rule"),
                    title: "新比赛规则",
                    description: "请填写这条规则的详细说明。",
                    enabled: true,
                },
            ],
        }));

    const addField = () =>
        setDraft((current) => ({
            ...current,
            form: {
                ...current.form,
                fields: [
                    ...current.form.fields,
                    {
                        id: newId("custom"),
                        label: "新报名字段",
                        type: "text",
                        placeholder: "请输入",
                        required: false,
                        enabled: true,
                        system: false,
                        width: "half",
                        options: [],
                        _optionsText: "",
                    },
                ],
            },
        }));

    const saveTemplate = async () => {
        if (!payload || !schedulePayload) return;
        if (!payload.event.title.trim()) {
            toast.error("请填写比赛标题");
            return;
        }
        if (!payload.rules.some((rule) => rule.enabled)) {
            toast.error("至少需要启用一条比赛规则");
            return;
        }
        const invalidOptionField = payload.form.fields.find(
            (field) =>
                field.enabled &&
                ["select", "multi_select"].includes(field.type) &&
                field.options.length === 0
        );
        if (invalidOptionField) {
            toast.error(`${invalidOptionField.label}至少需要一个选项`);
            return;
        }

        setSaving(true);
        try {
            const response = await api.put("/admin/hackathon/schedule", schedulePayload);
            const savedSchedule = normalizeHackathonSchedule(
                response.data?.schedule || schedulePayload
            );
            const saved = getHackathonScheduleEvent(savedSchedule, selectedEventKey);
            setScheduleDraft(savedSchedule);
            setSelectedEventKey(saved.event.key);
            setDraft(toEditorDraft(saved));
            setInitialPayload(JSON.stringify(savedSchedule));
            const archivesResponse = await api.get("/admin/competitions").catch(() => null);
            if (Array.isArray(archivesResponse?.data)) {
                setOutcomeArchives(archivesResponse.data);
            }
            onTemplateChange?.(saved, savedSchedule);
            toast.success("赛事日程已发布，前台时间轴会立即使用新配置");
        } catch (error) {
            const detail = error.response?.data?.details?.[0]?.message;
            toast.error(detail || error.response?.data?.error || "模板保存失败");
        } finally {
            setSaving(false);
        }
    };

    if (loading || !draft || !scheduleDraft) {
        return (
            <AdminPanel title="赛事页面模板" description="正在加载模板配置…">
                <div className={`py-6 text-center text-sm ${mutedTextClass}`}>加载中…</div>
            </AdminPanel>
        );
    }

    return (
        <div className="space-y-3">
            <AdminPanel
                title="赛事日程与页面模板"
                description={`共 ${scheduleDraft.events.length} 场比赛 · 日程修订 ${scheduleDraft.revision}${
                    scheduleDraft.updatedAt
                        ? ` · 最近发布 ${new Date(scheduleDraft.updatedAt).toLocaleString("zh-CN")}`
                        : " · 尚未发布自定义版本"
                }`}
                action={
                    <div className="flex flex-wrap gap-2">
                        <a
                            href={`/hackathon?event=${encodeURIComponent(selectedEventKey)}&view=${
                                getFirstAvailableHackathonView(draft, "register") || "showcase"
                            }`}
                            target="_blank"
                            rel="noreferrer"
                            className="theme-button-secondary rect-button inline-flex min-h-[40px] items-center gap-2 px-3.5 py-2 text-sm font-semibold"
                        >
                            <ExternalLink size={16} />
                            预览前台
                        </a>
                        <AdminButton
                            tone={dirty ? "primary" : "subtle"}
                            onClick={saveTemplate}
                            disabled={!dirty || saving}
                        >
                            <Save size={16} />
                            {saving ? "发布中…" : dirty ? "发布日程" : "已发布"}
                        </AdminButton>
                    </div>
                }
            >
                <AdminInlineNote tone="info">
                    每个日程节点都是一份独立模板，包含比赛信息、规则、报名表单和页面开关。
                    发布后，前台会按开始时间自动排序并生成同侧时间轴。
                </AdminInlineNote>
            </AdminPanel>

            <AdminPanel
                title="日程节点"
                action={
                    <div className="flex flex-wrap gap-2">
                        <AdminButton tone="subtle" onClick={() => addScheduleEvent(false)}>
                            <Plus size={16} />
                            新增比赛
                        </AdminButton>
                        <AdminButton tone="subtle" onClick={() => addScheduleEvent(true)}>
                            <Copy size={16} />
                            复制当前
                        </AdminButton>
                    </div>
                }
            >
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {schedulePayload.events.map((item, index) => {
                        const selected = item.event.key === selectedEventKey;
                        const isDefault = item.event.key === scheduleDraft.activeEventKey;
                        return (
                            <button
                                key={item.event.key}
                                type="button"
                                onClick={() => selectScheduleEvent(item.event.key)}
                                className={`rounded-xl border p-3 text-left transition ${
                                    selected
                                        ? isDayMode
                                            ? "border-emerald-400 bg-emerald-50 shadow-sm"
                                            : "border-cyan-300/60 bg-cyan-300/10"
                                        : isDayMode
                                          ? "border-slate-200 bg-white/70 hover:border-emerald-300"
                                          : "border-white/10 bg-white/[0.03] hover:border-cyan-300/35"
                                }`}
                            >
                                <span className="flex items-center justify-between gap-2 text-[11px] font-bold">
                                    <span className={mutedTextClass}>
                                        {String(index + 1).padStart(2, "0")} ·{" "}
                                        {item.event.startAt?.slice(0, 10) || "时间待定"}
                                    </span>
                                    {isDefault ? (
                                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-500">
                                            默认
                                        </span>
                                    ) : null}
                                </span>
                                <span className="mt-1 block truncate text-sm font-black">
                                    {item.event.title}
                                </span>
                                <span className={`mt-1 block truncate text-xs ${mutedTextClass}`}>
                                    {item.event.subtitle || item.event.description}
                                </span>
                            </button>
                        );
                    })}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className={`text-xs ${mutedTextClass}`}>
                        当前编辑：{draft.event.title} · 标识 {draft.event.key}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {scheduleDraft.activeEventKey !== selectedEventKey ? (
                            <AdminButton tone="subtle" onClick={setDefaultScheduleEvent}>
                                <CalendarRange size={16} />
                                设为默认节点
                            </AdminButton>
                        ) : null}
                        <AdminButton
                            tone="danger"
                            onClick={deleteScheduleEvent}
                            disabled={scheduleDraft.events.length <= 1}
                        >
                            <Trash2 size={16} />
                            删除当前节点
                        </AdminButton>
                    </div>
                </div>
            </AdminPanel>

            <AdminPanel
                title="比赛信息"
                description="维护标题、时间、地点、比赛形式和首屏关键数据。"
                action={<FileText size={18} className="text-indigo-300" />}
            >
                <div className="grid gap-3 lg:grid-cols-2">
                    <div className={fieldClass}>
                        <label className={labelClass}>比赛标题 *</label>
                        <input
                            value={draft.event.title}
                            onChange={(event) => updateEvent("title", event.target.value)}
                            className={inputClass}
                            placeholder="AI 全栈极速黑客松"
                        />
                    </div>
                    <div className={fieldClass}>
                        <label className={labelClass}>首屏短品牌</label>
                        <input
                            value={draft.event.brand}
                            onChange={(event) => updateEvent("brand", event.target.value)}
                            className={inputClass}
                            placeholder="AI Build Arena 2026"
                        />
                    </div>
                    <div className={fieldClass}>
                        <label className={labelClass}>开始时间 *</label>
                        <input
                            type="datetime-local"
                            value={draft.event.startAt}
                            onChange={(event) => updateEvent("startAt", event.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div className={fieldClass}>
                        <label className={labelClass}>结束时间</label>
                        <input
                            type="datetime-local"
                            value={draft.event.endAt}
                            onChange={(event) => updateEvent("endAt", event.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div className={fieldClass}>
                        <label className={labelClass}>比赛地点</label>
                        <input
                            value={draft.event.location}
                            onChange={(event) => updateEvent("location", event.target.value)}
                            className={inputClass}
                            placeholder="北2-112"
                        />
                    </div>
                    <div className={fieldClass}>
                        <label className={labelClass}>比赛形式</label>
                        <input
                            value={draft.event.format}
                            onChange={(event) => updateEvent("format", event.target.value)}
                            className={inputClass}
                            placeholder="个人赛"
                        />
                    </div>
                    <div className={fieldClass}>
                        <label className={labelClass}>比赛时长</label>
                        <input
                            value={draft.event.duration}
                            onChange={(event) => updateEvent("duration", event.target.value)}
                            className={inputClass}
                            placeholder="5 小时"
                        />
                    </div>
                    <div className={fieldClass}>
                        <label className={labelClass}>奖金池</label>
                        <div className="grid grid-cols-[1fr_92px] gap-2">
                            <input
                                value={draft.event.prizeValue}
                                onChange={(event) => updateEvent("prizeValue", event.target.value)}
                                className={inputClass}
                                placeholder="17,500"
                            />
                            <input
                                value={draft.event.prizeUnit}
                                onChange={(event) => updateEvent("prizeUnit", event.target.value)}
                                className={inputClass}
                                placeholder="￥"
                                aria-label="奖金单位"
                            />
                        </div>
                    </div>
                    <div className={`${fieldClass} lg:col-span-2`}>
                        <label className={labelClass}>首屏副标题</label>
                        <input
                            value={draft.event.subtitle}
                            onChange={(event) => updateEvent("subtitle", event.target.value)}
                            className={inputClass}
                            placeholder="5 小时、1 个人、0 路演"
                        />
                    </div>
                    <div className={`${fieldClass} lg:col-span-2`}>
                        <label className={labelClass}>比赛简介</label>
                        <textarea
                            value={draft.event.description}
                            onChange={(event) => updateEvent("description", event.target.value)}
                            className={inputClass}
                            rows={3}
                        />
                    </div>
                    <div className="grid gap-3 lg:col-span-2 lg:grid-cols-3">
                        <label className={`${fieldClass} flex items-start gap-3`}>
                            <input
                                type="checkbox"
                                checked={draft.navigation.registrationVisible}
                                onChange={(event) =>
                                    updateNavigation("registrationVisible", event.target.checked)
                                }
                                className="mt-0.5 h-4 w-4"
                            />
                            <span>
                                <span className="block text-sm font-semibold">显示赛事报名页</span>
                                <span className={`mt-1 block text-xs ${mutedTextClass}`}>
                                    关闭后前台“赛事报名”不可点击
                                </span>
                            </span>
                        </label>
                        <label className={`${fieldClass} flex items-start gap-3`}>
                            <input
                                type="checkbox"
                                checked={draft.navigation.resultsVisible}
                                onChange={(event) =>
                                    updateNavigation("resultsVisible", event.target.checked)
                                }
                                className="mt-0.5 h-4 w-4"
                            />
                            <span>
                                <span className="block text-sm font-semibold">显示比赛结果页</span>
                                <span className={`mt-1 block text-xs ${mutedTextClass}`}>
                                    关闭后前台“比赛结果”不可点击
                                </span>
                            </span>
                        </label>
                        <label className={`${fieldClass} flex items-start gap-3`}>
                            <input
                                type="checkbox"
                                checked={draft.event.registrationOpen}
                                onChange={(event) =>
                                    updateEvent("registrationOpen", event.target.checked)
                                }
                                className="mt-0.5 h-4 w-4"
                            />
                            <span>
                                <span className="block text-sm font-semibold">允许提交报名</span>
                                <span className={`mt-1 block text-xs ${mutedTextClass}`}>
                                    页面可见时，单独控制表单能否提交
                                </span>
                            </span>
                        </label>
                    </div>
                    <div className={`${fieldClass} lg:col-span-2`}>
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                            <div className="flex min-w-0 flex-1 items-start gap-3">
                                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-cyan-500/10 text-cyan-500">
                                    <Archive size={17} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <label className={labelClass}>比赛结果档案</label>
                                    <select
                                        value={draft.results.competitionSlug}
                                        onChange={(event) =>
                                            updateResults("competitionSlug", event.target.value)
                                        }
                                        className={inputClass}
                                        aria-label="比赛结果档案"
                                        title={draft.results.competitionSlug}
                                    >
                                        {!outcomeArchives.some(
                                            (archive) =>
                                                archive.slug === draft.results.competitionSlug
                                        ) ? (
                                            <option value={draft.results.competitionSlug}>
                                                自动创建 · {draft.results.competitionSlug}
                                            </option>
                                        ) : null}
                                        {outcomeArchives.map((archive) => {
                                            const ownerKey = outcomeOwnerBySlug.get(archive.slug);
                                            const ownedByOther =
                                                ownerKey && ownerKey !== selectedEventKey;
                                            return (
                                                <option
                                                    key={archive.id || archive.slug}
                                                    value={archive.slug}
                                                    disabled={ownedByOther}
                                                >
                                                    {archive.title} · {archive.slug}
                                                    {ownedByOther ? "（已绑定其他日程）" : ""}
                                                </option>
                                            );
                                        })}
                                    </select>
                                    <p className={`mt-2 break-all text-xs ${mutedTextClass}`}>
                                        档案标识：
                                        <code>{draft.results.competitionSlug}</code>
                                    </p>
                                </div>
                            </div>
                            <div className={`max-w-xl text-xs leading-5 ${mutedTextClass}`}>
                                发布日程时会自动创建或同步该档案。每场比赛只能绑定一个独立档案；
                                删除日程不会删除档案和历史成果。
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-4 grid gap-3 xl:grid-cols-3">
                    {draft.event.highlights.map((highlight, index) => (
                        <div key={highlight.id} className={fieldClass}>
                            <p className="mb-3 text-sm font-bold">首屏数据 {index + 1}</p>
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    value={highlight.value}
                                    onChange={(event) =>
                                        updateHighlight(index, "value", event.target.value)
                                    }
                                    className={inputClass}
                                    placeholder="数值"
                                    aria-label={`首屏数据 ${index + 1} 数值`}
                                />
                                <input
                                    value={highlight.unit}
                                    onChange={(event) =>
                                        updateHighlight(index, "unit", event.target.value)
                                    }
                                    className={inputClass}
                                    placeholder="单位"
                                    aria-label={`首屏数据 ${index + 1} 单位`}
                                />
                                <input
                                    value={highlight.label}
                                    onChange={(event) =>
                                        updateHighlight(index, "label", event.target.value)
                                    }
                                    className={`${inputClass} col-span-2`}
                                    placeholder="说明标题"
                                />
                                <input
                                    value={highlight.code}
                                    onChange={(event) =>
                                        updateHighlight(index, "code", event.target.value)
                                    }
                                    className={`${inputClass} col-span-2`}
                                    placeholder="英文短标，如 HOURS"
                                />
                                <textarea
                                    value={highlight.detail}
                                    onChange={(event) =>
                                        updateHighlight(index, "detail", event.target.value)
                                    }
                                    className={`${inputClass} col-span-2`}
                                    rows={2}
                                    placeholder="成果页中的补充说明"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </AdminPanel>

            <AdminPanel
                title="比赛规则与形式"
                description="规则可以启用、停用、排序或新增；前台赛制区会按这里的顺序展示。"
                action={
                    <AdminButton tone="subtle" onClick={addRule}>
                        <Plus size={16} />
                        新增规则
                    </AdminButton>
                }
            >
                <div className="space-y-3">
                    {draft.rules.map((rule, index) => (
                        <div key={rule.id} className={fieldClass}>
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                                <div className="grid min-w-0 flex-1 gap-2 lg:grid-cols-[minmax(180px,0.38fr)_1fr]">
                                    <input
                                        value={rule.title}
                                        onChange={(event) =>
                                            updateRule(index, "title", event.target.value)
                                        }
                                        className={inputClass}
                                        placeholder="规则标题"
                                    />
                                    <textarea
                                        value={rule.description}
                                        onChange={(event) =>
                                            updateRule(index, "description", event.target.value)
                                        }
                                        className={inputClass}
                                        rows={2}
                                        placeholder="规则详细说明"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="inline-flex min-h-[40px] items-center gap-2 px-2 text-xs font-semibold">
                                        <input
                                            type="checkbox"
                                            checked={rule.enabled}
                                            onChange={(event) =>
                                                updateRule(index, "enabled", event.target.checked)
                                            }
                                        />
                                        启用
                                    </label>
                                    <AdminIconButton
                                        label="上移规则"
                                        disabled={index === 0}
                                        onClick={() =>
                                            setDraft((current) => ({
                                                ...current,
                                                rules: moveItem(current.rules, index, -1),
                                            }))
                                        }
                                    >
                                        <ArrowUp size={16} />
                                    </AdminIconButton>
                                    <AdminIconButton
                                        label="下移规则"
                                        disabled={index === draft.rules.length - 1}
                                        onClick={() =>
                                            setDraft((current) => ({
                                                ...current,
                                                rules: moveItem(current.rules, index, 1),
                                            }))
                                        }
                                    >
                                        <ArrowDown size={16} />
                                    </AdminIconButton>
                                    <AdminIconButton
                                        label="删除规则"
                                        tone="danger"
                                        onClick={() =>
                                            setDraft((current) => ({
                                                ...current,
                                                rules: current.rules.filter(
                                                    (_item, ruleIndex) => ruleIndex !== index
                                                ),
                                            }))
                                        }
                                    >
                                        <Trash2 size={16} />
                                    </AdminIconButton>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </AdminPanel>

            <AdminPanel
                title="报名表单"
                description="支持文本、邮箱、电话、数字、单选、多选和确认勾选，可设置必填、宽度与顺序。"
                action={
                    <AdminButton tone="subtle" onClick={addField}>
                        <Plus size={16} />
                        新增字段
                    </AdminButton>
                }
            >
                <div className="mb-4 grid gap-3 lg:grid-cols-2">
                    <div className={fieldClass}>
                        <label className={labelClass}>表单标题</label>
                        <input
                            value={draft.form.title}
                            onChange={(event) => updateForm("title", event.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div className={fieldClass}>
                        <label className={labelClass}>提交按钮文字</label>
                        <input
                            value={draft.form.submitLabel}
                            onChange={(event) => updateForm("submitLabel", event.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div className={`${fieldClass} lg:col-span-2`}>
                        <label className={labelClass}>表单说明</label>
                        <textarea
                            value={draft.form.description}
                            onChange={(event) => updateForm("description", event.target.value)}
                            className={inputClass}
                            rows={2}
                        />
                    </div>
                    <div className={fieldClass}>
                        <label className={labelClass}>报名成功提示</label>
                        <input
                            value={draft.form.successMessage}
                            onChange={(event) => updateForm("successMessage", event.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div className={fieldClass}>
                        <label className={labelClass}>必填字段提示</label>
                        <input
                            value={draft.form.requiredHint}
                            onChange={(event) => updateForm("requiredHint", event.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div className={`${fieldClass} lg:col-span-2`}>
                        <label className={labelClass}>提交前隐私说明</label>
                        <input
                            value={draft.form.privacyNotice}
                            onChange={(event) => updateForm("privacyNotice", event.target.value)}
                            className={inputClass}
                        />
                    </div>
                </div>

                <AdminInlineNote tone="warning" className="mb-3">
                    姓名和学号是报名去重与后台识别所需的系统字段，可以改显示名称和顺序，但不能关闭或删除。
                    自定义字段的选项格式为每行一个“值|显示文字”。
                </AdminInlineNote>

                <div className="space-y-3">
                    {draft.form.fields.map((field, index) => {
                        const identityField = field.id === "name" || field.id === "studentId";
                        const needsOptions = ["select", "multi_select"].includes(field.type);
                        return (
                            <div key={field.id} className={fieldClass}>
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <ListChecks size={16} className="text-indigo-300" />
                                        <span className="text-sm font-bold">字段 {index + 1}</span>
                                        <code className={`text-xs ${mutedTextClass}`}>
                                            {field.id}
                                        </code>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <AdminIconButton
                                            label="上移字段"
                                            disabled={index === 0}
                                            onClick={() =>
                                                setDraft((current) => ({
                                                    ...current,
                                                    form: {
                                                        ...current.form,
                                                        fields: moveItem(
                                                            current.form.fields,
                                                            index,
                                                            -1
                                                        ),
                                                    },
                                                }))
                                            }
                                        >
                                            <ArrowUp size={16} />
                                        </AdminIconButton>
                                        <AdminIconButton
                                            label="下移字段"
                                            disabled={index === draft.form.fields.length - 1}
                                            onClick={() =>
                                                setDraft((current) => ({
                                                    ...current,
                                                    form: {
                                                        ...current.form,
                                                        fields: moveItem(
                                                            current.form.fields,
                                                            index,
                                                            1
                                                        ),
                                                    },
                                                }))
                                            }
                                        >
                                            <ArrowDown size={16} />
                                        </AdminIconButton>
                                        {!field.system ? (
                                            <AdminIconButton
                                                label="删除字段"
                                                tone="danger"
                                                onClick={() =>
                                                    setDraft((current) => ({
                                                        ...current,
                                                        form: {
                                                            ...current.form,
                                                            fields: current.form.fields.filter(
                                                                (_item, fieldIndex) =>
                                                                    fieldIndex !== index
                                                            ),
                                                        },
                                                    }))
                                                }
                                            >
                                                <Trash2 size={16} />
                                            </AdminIconButton>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                                    <div>
                                        <label className={labelClass}>显示名称</label>
                                        <input
                                            value={field.label}
                                            onChange={(event) =>
                                                updateField(index, "label", event.target.value)
                                            }
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>字段类型</label>
                                        <select
                                            value={field.type}
                                            disabled={identityField}
                                            onChange={(event) =>
                                                updateField(index, "type", event.target.value)
                                            }
                                            className={inputClass}
                                        >
                                            {FIELD_TYPE_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClass}>占用宽度</label>
                                        <select
                                            value={field.width}
                                            onChange={(event) =>
                                                updateField(index, "width", event.target.value)
                                            }
                                            className={inputClass}
                                        >
                                            <option value="half">半行</option>
                                            <option value="full">整行</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClass}>占位提示</label>
                                        <input
                                            value={field.placeholder}
                                            onChange={(event) =>
                                                updateField(
                                                    index,
                                                    "placeholder",
                                                    event.target.value
                                                )
                                            }
                                            className={inputClass}
                                        />
                                    </div>
                                </div>

                                {needsOptions ? (
                                    <div className="mt-3">
                                        <label className={labelClass}>
                                            选项（每行一个：值|显示文字）
                                        </label>
                                        <textarea
                                            value={field._optionsText}
                                            onChange={(event) =>
                                                updateField(
                                                    index,
                                                    "_optionsText",
                                                    event.target.value
                                                )
                                            }
                                            className={inputClass}
                                            rows={4}
                                        />
                                    </div>
                                ) : null}

                                <div className="mt-3 flex flex-wrap gap-5 text-sm font-semibold">
                                    <label className="inline-flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={field.required}
                                            disabled={identityField}
                                            onChange={(event) =>
                                                updateField(index, "required", event.target.checked)
                                            }
                                        />
                                        必填
                                    </label>
                                    <label className="inline-flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={field.enabled}
                                            disabled={identityField}
                                            onChange={(event) =>
                                                updateField(index, "enabled", event.target.checked)
                                            }
                                        />
                                        前台显示
                                    </label>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </AdminPanel>

            <div className="sticky bottom-3 z-20 flex justify-end">
                <div
                    className={`flex items-center gap-3 rounded-xl border p-2 shadow-2xl backdrop-blur-xl ${
                        isDayMode
                            ? "border-slate-200 bg-white/90"
                            : "border-white/10 bg-slate-950/90"
                    }`}
                >
                    <span className={`px-2 text-xs ${mutedTextClass}`}>
                        {dirty ? "有未发布修改" : "模板已同步"}
                    </span>
                    <AdminButton
                        tone={dirty ? "primary" : "subtle"}
                        onClick={saveTemplate}
                        disabled={!dirty || saving}
                    >
                        {dirty ? <Save size={16} /> : <Settings2 size={16} />}
                        {saving ? "发布中…" : dirty ? "发布日程" : "已发布"}
                    </AdminButton>
                </div>
            </div>
        </div>
    );
};

export default HackathonTemplateEditor;
