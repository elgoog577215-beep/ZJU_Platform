import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Check,
  Edit2,
  Eye,
  EyeOff,
  Handshake,
  Plus,
  RefreshCw,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Users,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../../services/api";
import { ECOSYSTEM_PARTNER_CATEGORIES } from "../../data/partnerLogos";
import {
  AdminButton,
  AdminEmptyState,
  AdminIconButton,
  AdminLoadingState,
  AdminMetricCard,
  AdminPageShell,
  AdminPanel,
  AdminTableCellText,
  AdminTableShell,
  AdminToolbar,
  ConfirmDialog,
  FilterChip,
  ToolbarGroup,
  useAdminTheme,
} from "./AdminUI";

const categoryMeta = {
  school: {
    label: "学校支持",
    shortLabel: "学校",
    icon: Building2,
    tone: "indigo",
  },
  organization: {
    label: "社团协作",
    shortLabel: "社团",
    icon: Users,
    tone: "emerald",
  },
  enterprise: {
    label: "企业生态",
    shortLabel: "企业",
    icon: Handshake,
    tone: "violet",
  },
};

const emptyForm = {
  category: "enterprise",
  name: "",
  description: "",
  logo_url: "",
  dark_logo_url: "",
  link_url: "",
  sort_order: 0,
  enabled: true,
  featured: true,
};

const normalizeForm = (partner = emptyForm) => ({
  category: partner.category || "enterprise",
  name: partner.name || "",
  description: partner.description || "",
  logo_url: partner.logo_url || "",
  dark_logo_url: partner.dark_logo_url || "",
  link_url: partner.link_url || "",
  sort_order: Number.parseInt(partner.sort_order ?? 0, 10) || 0,
  enabled: partner.enabled !== false,
  featured: partner.featured !== false,
});

const EcosystemPartnerManager = () => {
  const { isDayMode, headingTextClass, mutedTextClass } = useAdminTheme();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editingPartner, setEditingPartner] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deletePartner, setDeletePartner] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const response = await api.get("/admin/ecosystem-partners");
      setPartners(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error(error.response?.data?.error || "加载生态伙伴失败");
      setPartners([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const stats = useMemo(() => {
    const base = { total: partners.length, enabled: 0, featured: 0 };
    for (const partner of partners) {
      if (partner.enabled) base.enabled += 1;
      if (partner.featured) base.featured += 1;
      base[partner.category] = (base[partner.category] || 0) + 1;
    }
    return base;
  }, [partners]);

  const filteredPartners = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return partners.filter((partner) => {
      const matchesCategory =
        categoryFilter === "all" || partner.category === categoryFilter;
      if (!matchesCategory) return false;
      if (!keyword) return true;
      return [
        partner.name,
        partner.description,
        partner.logo_url,
        partner.dark_logo_url,
        partner.link_url,
      ]
        .map((value) => String(value || "").toLowerCase())
        .some((value) => value.includes(keyword));
    });
  }, [categoryFilter, partners, search]);

  const updateForm = (key, value) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const openCreate = () => {
    setEditingPartner({ id: null });
    setForm(emptyForm);
  };

  const openEdit = (partner) => {
    setEditingPartner(partner);
    setForm(normalizeForm(partner));
  };

  const closeEditor = () => {
    setEditingPartner(null);
    setForm(emptyForm);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("请填写合作方名称");
      return;
    }
    setSubmitting(true);
    const payload = {
      ...form,
      name: form.name.trim(),
      description: form.description.trim(),
      logo_url: form.logo_url.trim(),
      dark_logo_url: form.dark_logo_url.trim(),
      link_url: form.link_url.trim(),
      sort_order: Number.parseInt(form.sort_order, 10) || 0,
    };

    try {
      if (editingPartner?.id) {
        const response = await api.put(
          `/admin/ecosystem-partners/${editingPartner.id}`,
          payload,
        );
        setPartners((previous) =>
          previous.map((partner) =>
            partner.id === editingPartner.id ? response.data : partner,
          ),
        );
        toast.success("合作方已更新");
      } else {
        const response = await api.post("/admin/ecosystem-partners", payload);
        setPartners((previous) => [...previous, response.data]);
        toast.success("合作方已创建");
      }
      closeEditor();
    } catch (error) {
      toast.error(error.response?.data?.error || "保存合作方失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (partner, key) => {
    try {
      const response = await api.put(`/admin/ecosystem-partners/${partner.id}`, {
        ...normalizeForm(partner),
        [key]: !partner[key],
      });
      setPartners((previous) =>
        previous.map((item) => (item.id === partner.id ? response.data : item)),
      );
      toast.success("状态已更新");
    } catch (error) {
      toast.error(error.response?.data?.error || "更新状态失败");
    }
  };

  const handleDelete = async () => {
    if (!deletePartner) return;
    setSubmitting(true);
    try {
      await api.delete(`/admin/ecosystem-partners/${deletePartner.id}`);
      setPartners((previous) =>
        previous.filter((partner) => partner.id !== deletePartner.id),
      );
      toast.success("合作方已删除");
      setDeletePartner(null);
    } catch (error) {
      toast.error(error.response?.data?.error || "删除合作方失败");
    } finally {
      setSubmitting(false);
    }
  };

  const renderLogo = (partner) => {
    const logoUrl = isDayMode
      ? partner.logo_url || partner.dark_logo_url
      : partner.dark_logo_url || partner.logo_url;
    if (!logoUrl) {
      return (
        <div
          className={`flex h-11 w-16 items-center justify-center rounded-xl border text-xs font-bold ${
            isDayMode
              ? "border-slate-200 bg-slate-50 text-slate-400"
              : "border-white/10 bg-white/5 text-gray-500"
          }`}
        >
          文字
        </div>
      );
    }
    return (
      <div
        className={`flex h-11 w-20 items-center justify-center rounded-xl border px-2 ${
          isDayMode ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"
        }`}
      >
        <img
          src={logoUrl}
          alt={`${partner.name} logo`}
          className="max-h-7 max-w-full object-contain"
          loading="lazy"
        />
      </div>
    );
  };

  const renderCategory = (category) => {
    const meta = categoryMeta[category] || categoryMeta.enterprise;
    const Icon = meta.icon;
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
          isDayMode
            ? "border-slate-200 bg-white/75 text-slate-700"
            : "border-white/10 bg-white/5 text-gray-200"
        }`}
      >
        <Icon size={13} />
        {meta.shortLabel}
      </span>
    );
  };

  const renderSwitch = (partner, key, enabledLabel, disabledLabel) => {
    const enabled = Boolean(partner[key]);
    const Icon = enabled ? ToggleRight : ToggleLeft;
    return (
      <button
        type="button"
        onClick={() => handleToggle(partner, key)}
        className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition ${
          enabled
            ? isDayMode
              ? "bg-emerald-500/10 text-emerald-700"
              : "bg-emerald-500/15 text-emerald-200"
            : isDayMode
              ? "bg-slate-100 text-slate-500"
              : "bg-white/5 text-gray-400"
        }`}
      >
        <Icon size={16} />
        {enabled ? enabledLabel : disabledLabel}
      </button>
    );
  };

  const renderMobileCards = () => (
    <div className="grid gap-3 md:hidden">
      {filteredPartners.map((partner) => (
        <article
          key={partner.id}
          className={`rounded-2xl border p-4 ${
            isDayMode
              ? "border-slate-200/70 bg-white/[0.78]"
              : "border-white/10 bg-white/[0.03]"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {renderLogo(partner)}
              <div className="min-w-0">
                <h3 className={`truncate font-semibold ${headingTextClass}`}>
                  {partner.name}
                </h3>
                <div className="mt-1">{renderCategory(partner.category)}</div>
              </div>
            </div>
            <AdminIconButton label="编辑合作方" onClick={() => openEdit(partner)}>
              <Edit2 size={16} />
            </AdminIconButton>
          </div>
          {partner.description ? (
            <p className={`mt-3 line-clamp-2 text-sm leading-6 ${mutedTextClass}`}>
              {partner.description}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {renderSwitch(partner, "enabled", "启用", "停用")}
            {renderSwitch(partner, "featured", "全站展示", "隐藏")}
            <AdminIconButton
              label="删除合作方"
              tone="danger"
              onClick={() => setDeletePartner(partner)}
            >
              <Trash2 size={16} />
            </AdminIconButton>
          </div>
        </article>
      ))}
    </div>
  );

  if (loading) {
    return <AdminLoadingState text="正在加载生态伙伴..." />;
  }

  return (
    <>
      <AdminPageShell
        title="生态伙伴管理"
        description="统一维护学校支持、社团协作与企业生态；保存后会同步影响首页、关于页和黑客松页面。"
        actions={
          <>
            <AdminButton tone="subtle" onClick={fetchPartners}>
              <RefreshCw size={16} />
              刷新
            </AdminButton>
            <AdminButton tone="primary" onClick={openCreate}>
              <Plus size={16} />
              新建合作方
            </AdminButton>
          </>
        }
        toolbar={
          <AdminToolbar>
            <ToolbarGroup className="w-full flex-1">
              <div className="relative w-full min-w-0 flex-1 md:max-w-lg">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="搜索名称、说明、链接或 logo 路径"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="theme-admin-input w-full rounded-xl py-2.5 pl-10 pr-4 text-sm"
                />
              </div>
            </ToolbarGroup>
            <ToolbarGroup>
              <FilterChip
                active={categoryFilter === "all"}
                onClick={() => setCategoryFilter("all")}
              >
                全部
              </FilterChip>
              {ECOSYSTEM_PARTNER_CATEGORIES.map((category) => (
                <FilterChip
                  key={category.id}
                  active={categoryFilter === category.id}
                  onClick={() => setCategoryFilter(category.id)}
                >
                  {category.shortLabel}
                </FilterChip>
              ))}
            </ToolbarGroup>
          </AdminToolbar>
        }
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <AdminMetricCard label="合作方" value={stats.total} icon={Handshake} />
          <AdminMetricCard
            label="启用中"
            value={stats.enabled}
            icon={Eye}
            tone="emerald"
          />
          <AdminMetricCard
            label="全站展示"
            value={stats.featured}
            icon={EyeOff}
            tone="violet"
          />
          <AdminMetricCard
            label="学校/社团"
            value={`${stats.school || 0}/${stats.organization || 0}`}
            icon={Users}
            tone="amber"
          />
          <AdminMetricCard
            label="企业伙伴"
            value={stats.enterprise || 0}
            icon={Building2}
            tone="indigo"
          />
        </div>

        <AdminPanel
          title={`合作方列表 (${filteredPartners.length})`}
          description="排序数值越小越靠前；关闭“全站展示”会保留数据但不进入前台背书模块。"
        >
          {filteredPartners.length === 0 ? (
            <AdminEmptyState
              icon={Handshake}
              title="没有匹配的合作方"
              description="可以清空搜索词、切换分类，或新建一个合作方。"
            />
          ) : (
            <>
              {renderMobileCards()}
              <AdminTableShell minWidth={1120}>
                <thead>
                  <tr className="theme-admin-table-head border-b text-xs uppercase tracking-[0.2em]">
                    <th className="p-4">合作方</th>
                    <th className="p-4">分类</th>
                    <th className="p-4">说明</th>
                    <th className="p-4">排序</th>
                    <th className="p-4">状态</th>
                    <th className="p-4 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="theme-admin-table-body divide-y">
                  {filteredPartners.map((partner) => (
                    <tr key={partner.id} className="theme-admin-row">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {renderLogo(partner)}
                          <div className="min-w-0">
                            <AdminTableCellText strong className="block truncate">
                              {partner.name}
                            </AdminTableCellText>
                            {partner.link_url ? (
                              <AdminTableCellText className="mt-1 block max-w-[260px] truncate text-xs">
                                {partner.link_url}
                              </AdminTableCellText>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">{renderCategory(partner.category)}</td>
                      <td className="p-4">
                        <AdminTableCellText className="line-clamp-2 max-w-[320px]">
                          {partner.description || "暂无说明"}
                        </AdminTableCellText>
                      </td>
                      <td className="p-4">
                        <AdminTableCellText>{partner.sort_order || 0}</AdminTableCellText>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {renderSwitch(partner, "enabled", "启用", "停用")}
                          {renderSwitch(partner, "featured", "展示", "隐藏")}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <AdminIconButton
                            label="编辑合作方"
                            onClick={() => openEdit(partner)}
                          >
                            <Edit2 size={16} />
                          </AdminIconButton>
                          <AdminIconButton
                            label="删除合作方"
                            tone="danger"
                            onClick={() => setDeletePartner(partner)}
                          >
                            <Trash2 size={16} />
                          </AdminIconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </AdminTableShell>
            </>
          )}
        </AdminPanel>
      </AdminPageShell>

      <ConfirmDialog
        open={Boolean(editingPartner)}
        title={editingPartner?.id ? "编辑合作方" : "新建合作方"}
        description="学校和社团可以只填名称；企业伙伴建议补充明暗两套 logo。"
        confirmText={editingPartner?.id ? "保存修改" : "创建"}
        tone="primary"
        pending={submitting}
        onConfirm={handleSubmit}
        onCancel={closeEditor}
      >
        <div className="grid gap-4">
          <label className={`block text-sm font-semibold ${headingTextClass}`}>
            分类
            <select
              value={form.category}
              onChange={(event) => updateForm("category", event.target.value)}
              className="theme-admin-input mt-2 w-full rounded-xl px-3 py-2.5 text-sm"
            >
              {ECOSYSTEM_PARTNER_CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>

          <label className={`block text-sm font-semibold ${headingTextClass}`}>
            名称
            <input
              value={form.name}
              onChange={(event) => updateForm("name", event.target.value)}
              maxLength={120}
              placeholder="例如：未来学习中心 / Qoder"
              className="theme-admin-input mt-2 w-full rounded-xl px-3 py-2.5 text-sm"
              autoFocus
            />
          </label>

          <label className={`block text-sm font-semibold ${headingTextClass}`}>
            简短说明
            <textarea
              value={form.description}
              onChange={(event) => updateForm("description", event.target.value)}
              rows={3}
              maxLength={500}
              placeholder="说明它在生态中的支持方式"
              className="theme-admin-input mt-2 w-full resize-none rounded-xl px-3 py-2.5 text-sm leading-6"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className={`block text-sm font-semibold ${headingTextClass}`}>
              Logo 明亮版
              <input
                value={form.logo_url}
                onChange={(event) => updateForm("logo_url", event.target.value)}
                placeholder="/images/partner-logos/example.png"
                className="theme-admin-input mt-2 w-full rounded-xl px-3 py-2.5 text-sm"
              />
            </label>
            <label className={`block text-sm font-semibold ${headingTextClass}`}>
              Logo 深色版
              <input
                value={form.dark_logo_url}
                onChange={(event) => updateForm("dark_logo_url", event.target.value)}
                placeholder="/images/partner-logos/example-dark.png"
                className="theme-admin-input mt-2 w-full rounded-xl px-3 py-2.5 text-sm"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <label className={`block text-sm font-semibold ${headingTextClass}`}>
              官网或链接
              <input
                value={form.link_url}
                onChange={(event) => updateForm("link_url", event.target.value)}
                placeholder="https://..."
                className="theme-admin-input mt-2 w-full rounded-xl px-3 py-2.5 text-sm"
              />
            </label>
            <label className={`block text-sm font-semibold ${headingTextClass}`}>
              排序
              <input
                type="number"
                value={form.sort_order}
                onChange={(event) => updateForm("sort_order", event.target.value)}
                className="theme-admin-input mt-2 w-full rounded-xl px-3 py-2.5 text-sm"
              />
            </label>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => updateForm("enabled", !form.enabled)}
              className={`flex min-h-11 items-center justify-between rounded-xl border px-3 text-sm font-semibold ${
                form.enabled
                  ? isDayMode
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                    : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                  : isDayMode
                    ? "border-slate-200 bg-slate-50 text-slate-500"
                    : "border-white/10 bg-white/5 text-gray-400"
              }`}
            >
              启用合作方
              {form.enabled ? <Check size={16} /> : <X size={16} />}
            </button>
            <button
              type="button"
              onClick={() => updateForm("featured", !form.featured)}
              className={`flex min-h-11 items-center justify-between rounded-xl border px-3 text-sm font-semibold ${
                form.featured
                  ? isDayMode
                    ? "border-indigo-500/20 bg-indigo-500/10 text-indigo-700"
                    : "border-indigo-500/20 bg-indigo-500/10 text-indigo-200"
                  : isDayMode
                    ? "border-slate-200 bg-slate-50 text-slate-500"
                    : "border-white/10 bg-white/5 text-gray-400"
              }`}
            >
              进入全站背书
              {form.featured ? <Check size={16} /> : <X size={16} />}
            </button>
          </div>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(deletePartner)}
        title="确认删除合作方"
        description={
          deletePartner
            ? `删除“${deletePartner.name}”后，前台所有生态背书模块都会不再展示它。`
            : ""
        }
        confirmText="确认删除"
        tone="danger"
        pending={submitting}
        onConfirm={handleDelete}
        onCancel={() => setDeletePartner(null)}
      />
    </>
  );
};

export default EcosystemPartnerManager;
