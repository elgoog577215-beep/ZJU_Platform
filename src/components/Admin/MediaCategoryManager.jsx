import React, { useMemo, useState } from "react";
import {
  Edit2,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";
import useMediaCategories from "../../hooks/useMediaCategories";
import {
  AdminButton,
  AdminEmptyState,
  AdminIconButton,
  AdminLoadingState,
  AdminPageShell,
  AdminPanel,
  AdminTableCellText,
  AdminTableShell,
  ConfirmDialog,
  StatusBadge,
  useAdminTheme,
} from "./AdminUI";

const emptyForm = {
  name: "",
  description: "",
  sort_order: 0,
  status: "active",
};

const MediaCategoryManager = () => {
  const { isDayMode, mutedTextClass } = useAdminTheme();
  const { categories, loading, refresh } = useMediaCategories({ admin: true });
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.id - b.id),
    [categories],
  );

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const editCategory = (category) => {
    setEditingId(category.id);
    setForm({
      name: category.name || "",
      description: category.description || "",
      sort_order: category.sort_order || 0,
      status: category.status || "active",
    });
  };

  const submitForm = async (event) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      toast.error("请填写分类名称");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        name,
        sort_order: Number.parseInt(form.sort_order, 10) || 0,
      };
      if (editingId) {
        await api.put(`/admin/media-categories/${editingId}`, payload);
        toast.success("影像分类已更新");
      } else {
        await api.post("/admin/media-categories", payload);
        toast.success("影像分类已创建");
      }
      resetForm();
      refresh({ clearCache: true });
    } catch (error) {
      toast.error(error.response?.data?.error || "保存分类失败");
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async () => {
    if (!confirmDelete) return;
    setSaving(true);
    try {
      await api.delete(`/admin/media-categories/${confirmDelete.id}`);
      toast.success("影像分类已停用并移入删除状态");
      setConfirmDelete(null);
      refresh({ clearCache: true });
    } catch (error) {
      toast.error(error.response?.data?.error || "删除分类失败");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <AdminLoadingState text="正在加载影像分类..." />;
  }

  return (
    <>
      <AdminPageShell
        title="影像分类"
        description="维护影像库分类。图片和视频上传时共享这套分类。"
        actions={
          <AdminButton tone="subtle" onClick={() => refresh({ clearCache: true })}>
            <RefreshCw size={16} />
            刷新
          </AdminButton>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <AdminPanel title={editingId ? "编辑分类" : "新建分类"}>
            <form onSubmit={submitForm} className="space-y-3">
              <div>
                <label className={`text-xs font-bold ${mutedTextClass}`}>分类名称</label>
                <input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="theme-admin-input mt-1 w-full px-3 py-2.5 text-sm"
                  placeholder="例如：黑客松第一季"
                />
              </div>
              <div>
                <label className={`text-xs font-bold ${mutedTextClass}`}>说明</label>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  className="theme-admin-input mt-1 h-24 w-full resize-none px-3 py-2.5 text-sm"
                  placeholder="可选，用于后台备注"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`text-xs font-bold ${mutedTextClass}`}>排序</label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(event) => setForm((prev) => ({ ...prev, sort_order: event.target.value }))}
                    className="theme-admin-input mt-1 w-full px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className={`text-xs font-bold ${mutedTextClass}`}>状态</label>
                  <select
                    value={form.status}
                    onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                    className="theme-admin-input mt-1 w-full px-3 py-2.5 text-sm"
                  >
                    <option value="active">启用</option>
                    <option value="inactive">停用</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <AdminButton type="submit" tone="primary" disabled={saving}>
                  <Plus size={16} />
                  {editingId ? "保存修改" : "创建分类"}
                </AdminButton>
                {editingId ? (
                  <AdminButton tone="subtle" onClick={resetForm}>
                    取消编辑
                  </AdminButton>
                ) : null}
              </div>
            </form>
          </AdminPanel>

          <AdminPanel title={`分类列表 (${sortedCategories.length})`}>
            {sortedCategories.length === 0 ? (
              <AdminEmptyState
                icon={ImageIcon}
                title="暂无影像分类"
                description="创建分类后，用户上传图片和视频时就可以选择归档位置。"
              />
            ) : (
              <AdminTableShell minWidth={760}>
                <thead>
                  <tr className="theme-admin-table-head border-b text-xs uppercase tracking-[0.2em]">
                    <th className="p-4">名称</th>
                    <th className="p-4">状态</th>
                    <th className="p-4">排序</th>
                    <th className="p-4">资源数</th>
                    <th className="p-4 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="theme-admin-table-body divide-y">
                  {sortedCategories.map((category) => (
                    <tr key={category.id} className="theme-admin-row">
                      <td className="p-4">
                        <AdminTableCellText strong>{category.name}</AdminTableCellText>
                        {category.description ? (
                          <div className={`mt-1 max-w-md text-xs ${mutedTextClass}`}>
                            {category.description}
                          </div>
                        ) : null}
                      </td>
                      <td className="p-4">
                        <StatusBadge status={category.status === "active" ? "approved" : "deleted"} />
                      </td>
                      <td className="p-4">{category.sort_order || 0}</td>
                      <td className="p-4">
                        <span className={isDayMode ? "text-slate-700" : "text-gray-200"}>
                          图片 {category.photo_count || 0} / 视频 {category.video_count || 0}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <AdminIconButton label="编辑" onClick={() => editCategory(category)}>
                            <Edit2 size={16} />
                          </AdminIconButton>
                          <AdminIconButton label="删除" tone="danger" onClick={() => setConfirmDelete(category)}>
                            <Trash2 size={16} />
                          </AdminIconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </AdminTableShell>
            )}
          </AdminPanel>
        </div>
      </AdminPageShell>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="删除影像分类"
        description="分类会被软删除并从上传选项中移除，历史图片和视频不会被删除。"
        confirmText="确认删除"
        tone="danger"
        pending={saving}
        onConfirm={deleteCategory}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
};

export default MediaCategoryManager;
