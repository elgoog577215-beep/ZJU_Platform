import React, { useEffect, useMemo, useState } from "react";
import {
  Bot,
  CheckCircle2,
  Pencil,
  KeyRound,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";
import {
  AdminButton,
  AdminEmptyState,
  AdminIconButton,
  AdminLoadingState,
  AdminPageShell,
  AdminPanel,
  StatusBadge,
  useAdminTheme,
} from "./AdminUI";

const emptyForm = {
  name: "活动推荐助手",
  provider: "openai-compatible",
  base_url: "https://api.deepseek.com/v1",
  model: "deepseek-chat",
  api_key: "",
  priority: 100,
  enabled: true,
};

const statusLabel = {
  ok: "可用",
  failed: "异常",
};

const AiModelConfigManager = ({ embedded = false }) => {
  const { isDayMode, mutedTextClass, headingTextClass } = useAdminTheme();
  const [configs, setConfigs] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingEditId, setSavingEditId] = useState(null);
  const [testingId, setTestingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [editMap, setEditMap] = useState({});

  const enabledCount = useMemo(
    () => configs.filter((config) => config.enabled).length,
    [configs],
  );

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const response = await api.get("/admin/ai-model-configs");
      setConfigs(Array.isArray(response.data) ? response.data : []);
    } catch {
      toast.error("AI Key 配置加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const updateForm = (key, value) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const startEdit = (config) => {
    setEditMap((previous) => ({
      ...previous,
      [config.id]: {
        name: config.name || "",
        base_url: config.base_url || "",
        model: config.model || "",
        priority: config.priority || 100,
        api_key: "",
      },
    }));
  };

  const updateEdit = (id, key, value) => {
    setEditMap((previous) => ({
      ...previous,
      [id]: {
        ...previous[id],
        [key]: value,
      },
    }));
  };

  const cancelEdit = (id) => {
    setEditMap((previous) => {
      const next = { ...previous };
      delete next[id];
      return next;
    });
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!form.api_key.trim()) {
      toast.error("请先填写 API Key");
      return;
    }

    setSaving(true);
    try {
      const response = await api.post("/admin/ai-model-configs", {
        ...form,
        priority: Number(form.priority) || 100,
      });
      setConfigs((previous) => [...previous, response.data]);
      setForm(emptyForm);
      toast.success("AI Key 已添加");
    } catch (error) {
      toast.error(error?.response?.data?.message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (config, patch) => {
    try {
      const response = await api.put(`/admin/ai-model-configs/${config.id}`, patch);
      setConfigs((previous) =>
        previous.map((item) => (item.id === config.id ? response.data : item)),
      );
      toast.success("配置已更新");
    } catch (error) {
      toast.error(error?.response?.data?.message || "更新失败");
    }
  };

  const handleSaveEdit = async (config) => {
    const draft = editMap[config.id];
    if (!draft) return;

    const payload = {
      name: draft.name.trim(),
      base_url: draft.base_url.trim(),
      model: draft.model.trim(),
      priority: Number(draft.priority) || 100,
    };

    if (!payload.name || !payload.base_url || !payload.model) {
      toast.error("名称、地址和模型不能为空");
      return;
    }
    if (draft.api_key.trim()) {
      payload.api_key = draft.api_key.trim();
    }

    setSavingEditId(config.id);
    try {
      const response = await api.put(`/admin/ai-model-configs/${config.id}`, payload);
      setConfigs((previous) =>
        previous.map((item) => (item.id === config.id ? response.data : item)),
      );
      cancelEdit(config.id);
      toast.success("配置已保存");
    } catch (error) {
      toast.error(error?.response?.data?.message || "保存失败");
    } finally {
      setSavingEditId(null);
    }
  };

  const handleTest = async (config) => {
    setTestingId(config.id);
    try {
      const response = await api.post(`/admin/ai-model-configs/${config.id}/test`);
      setConfigs((previous) =>
        previous.map((item) => (item.id === config.id ? response.data : item)),
      );
      toast.success("模型连接可用");
    } catch (error) {
      toast.error(error?.response?.data?.message || "测试失败，请检查 Key 或地址");
      await fetchConfigs();
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async (config) => {
    setDeletingId(config.id);
    try {
      await api.delete(`/admin/ai-model-configs/${config.id}`);
      setConfigs((previous) => previous.filter((item) => item.id !== config.id));
      toast.success("配置已删除");
    } catch {
      toast.error("删除失败");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <AdminLoadingState text="正在加载 AI 模型配置..." />;
  }

  const fieldClass = "theme-admin-input rounded-xl px-3 py-2.5 text-sm";
  const cardClass = isDayMode
    ? "border-slate-200/70 bg-white/[0.74]"
    : "border-white/10 bg-white/[0.04]";

  const content = (
    <>
      {!embedded ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-xl border border-[rgba(128,146,167,0.18)] px-3 py-2 text-sm">
            <ShieldCheck size={16} />
            已启用 {enabledCount} 个
          </span>
        </div>
      ) : null}

      <AdminPanel title="添加 Key">
        <form onSubmit={handleCreate} className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              <span className={mutedTextClass}>显示名称</span>
              <input
                className={fieldClass}
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
                placeholder="活动推荐助手"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              <span className={mutedTextClass}>模型名称</span>
              <input
                className={fieldClass}
                value={form.model}
                onChange={(event) => updateForm("model", event.target.value)}
                placeholder="deepseek-chat"
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px]">
            <label className="grid gap-2 text-sm font-medium">
              <span className={mutedTextClass}>接口地址</span>
              <input
                className={fieldClass}
                value={form.base_url}
                onChange={(event) => updateForm("base_url", event.target.value)}
                placeholder="https://api.deepseek.com/v1"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              <span className={mutedTextClass}>优先级</span>
              <input
                type="number"
                className={fieldClass}
                value={form.priority}
                onChange={(event) => updateForm("priority", event.target.value)}
                min="1"
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-medium">
            <span className={mutedTextClass}>API Key</span>
            <input
              type="password"
              className={fieldClass}
              value={form.api_key}
              onChange={(event) => updateForm("api_key", event.target.value)}
              placeholder="sk-..."
              autoComplete="off"
            />
          </label>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(event) => updateForm("enabled", event.target.checked)}
                className="h-4 w-4 rounded"
              />
              <span className={mutedTextClass}>添加后立即启用</span>
            </label>
            <AdminButton tone="primary" type="submit" disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              添加 Key
            </AdminButton>
          </div>
        </form>
      </AdminPanel>

      <AdminPanel title={`Key 列表 (${configs.length})`}>
        {configs.length === 0 ? (
          <AdminEmptyState
            icon={Zap}
            title="暂无 Key"
          />
        ) : (
          <div className="grid gap-3">
            {configs.map((config) => {
              const editDraft = editMap[config.id];

              return (
              <div key={config.id} className={`rounded-2xl border p-4 ${cardClass}`}>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={`text-base font-bold ${headingTextClass}`}>
                        {config.name}
                      </h3>
                      <StatusBadge
                        status={config.last_status === "ok" ? "approved" : config.last_status === "failed" ? "rejected" : "published"}
                        label={statusLabel[config.last_status] || "未测试"}
                      />
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${config.enabled ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600" : "border-slate-400/20 bg-slate-500/10 text-slate-500"}`}>
                        {config.enabled ? "启用中" : "已停用"}
                      </span>
                    </div>
                    <div className={`mt-3 grid gap-2 text-sm md:grid-cols-2 ${mutedTextClass}`}>
                      <div className="truncate">模型 {config.model}</div>
                      <div className="truncate">地址 {config.base_url}</div>
                      <div>Key {config.masked_api_key || "未显示"}</div>
                      <div>优先级 {config.priority}</div>
                      {config.last_error ? (
                        <div className="text-rose-500">最近错误：{config.last_error}</div>
                      ) : null}
                    </div>

                    {editDraft ? (
                      <div className="mt-4 grid gap-3 rounded-2xl border border-[rgba(128,146,167,0.16)] p-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="grid gap-2 text-sm font-medium">
                            <span className={mutedTextClass}>显示名称</span>
                            <input
                              className={fieldClass}
                              value={editDraft.name}
                              onChange={(event) => updateEdit(config.id, "name", event.target.value)}
                            />
                          </label>
                          <label className="grid gap-2 text-sm font-medium">
                            <span className={mutedTextClass}>模型名称</span>
                            <input
                              className={fieldClass}
                              value={editDraft.model}
                              onChange={(event) => updateEdit(config.id, "model", event.target.value)}
                            />
                          </label>
                        </div>

                        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px]">
                          <label className="grid gap-2 text-sm font-medium">
                            <span className={mutedTextClass}>接口地址</span>
                            <input
                              className={fieldClass}
                              value={editDraft.base_url}
                              onChange={(event) => updateEdit(config.id, "base_url", event.target.value)}
                            />
                          </label>
                          <label className="grid gap-2 text-sm font-medium">
                            <span className={mutedTextClass}>优先级</span>
                            <input
                              type="number"
                              className={fieldClass}
                              value={editDraft.priority}
                              min="1"
                              onChange={(event) => updateEdit(config.id, "priority", event.target.value)}
                            />
                          </label>
                        </div>

                        <label className="grid gap-2 text-sm font-medium">
                          <span className={mutedTextClass}>更换 API Key</span>
                          <input
                            type="password"
                            className={fieldClass}
                            value={editDraft.api_key}
                            onChange={(event) => updateEdit(config.id, "api_key", event.target.value)}
                            placeholder="留空则不更换"
                            autoComplete="off"
                          />
                        </label>

                        <div className="flex flex-wrap items-center gap-2">
                          <AdminButton
                            tone="primary"
                            disabled={savingEditId === config.id}
                            onClick={() => handleSaveEdit(config)}
                          >
                            {savingEditId === config.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Save size={16} />
                            )}
                            保存修改
                          </AdminButton>
                          <AdminButton tone="subtle" onClick={() => cancelEdit(config.id)}>
                            取消
                          </AdminButton>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <AdminButton
                      tone="subtle"
                      onClick={() => (editDraft ? cancelEdit(config.id) : startEdit(config))}
                    >
                      <Pencil size={16} />
                      {editDraft ? "收起" : "编辑"}
                    </AdminButton>
                    <AdminButton
                      tone="subtle"
                      disabled={testingId === config.id}
                      onClick={() => handleTest(config)}
                    >
                      {testingId === config.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                      测试
                    </AdminButton>
                    <AdminButton
                      tone={config.enabled ? "subtle" : "primary"}
                      onClick={() => handleUpdate(config, { enabled: !config.enabled })}
                    >
                      <Save size={16} />
                      {config.enabled ? "停用" : "启用"}
                    </AdminButton>
                    <AdminIconButton
                      label="删除配置"
                      tone="danger"
                      disabled={deletingId === config.id}
                      onClick={() => handleDelete(config)}
                    >
                      {deletingId === config.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </AdminIconButton>
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        )}
      </AdminPanel>
    </>
  );

  if (embedded) {
    return <div className="space-y-4">{content}</div>;
  }

  return (
    <AdminPageShell
      title="模型 Key"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-xl border border-[rgba(128,146,167,0.18)] px-3 py-2 text-sm">
            <ShieldCheck size={16} />
            已启用 {enabledCount} 个
          </span>
        </div>
      }
    >
      {content}
    </AdminPageShell>
  );
};

export default AiModelConfigManager;
