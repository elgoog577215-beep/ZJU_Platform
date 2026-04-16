import React, { useEffect, useMemo, useState } from "react";
import {
  Tag,
  Search,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";
import {
  AdminButton,
  AdminEmptyState,
  AdminLoadingState,
  AdminPageShell,
  AdminPanel,
  AdminToolbar,
  ConfirmDialog,
  FilterChip,
  ToolbarGroup,
} from "./AdminUI";

const SECTION_OPTIONS = [
  { id: "all", label: "全部" },
  { id: "gallery", label: "图片" },
  { id: "music", label: "音频" },
  { id: "videos", label: "视频" },
  { id: "articles", label: "文章" },
  { id: "events", label: "活动" },
];

const TagManager = () => {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSection, setSelectedSection] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [newTagMode, setNewTagMode] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [deleteTag, setDeleteTag] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const response = await api.get("/tags");
      setTags(Array.isArray(response.data) ? response.data : []);
    } catch {
      toast.error("加载标签失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.post("/tags/sync");
      toast.success("标签计数已同步");
      fetchTags();
    } catch {
      toast.error("同步标签失败");
    } finally {
      setSyncing(false);
    }
  };

  const handleCreate = async () => {
    if (!newTagName.trim()) return;
    setSubmitting(true);
    try {
      const response = await api.post("/tags", { name: newTagName.trim() });
      setTags((previous) => [...previous, response.data]);
      setNewTagName("");
      setNewTagMode(false);
      toast.success("标签已创建");
    } catch (error) {
      toast.error(error.response?.data?.error || "创建标签失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (id) => {
    if (!editName.trim()) return;
    setSubmitting(true);
    try {
      await api.put(`/tags/${id}`, { name: editName.trim() });
      setTags((previous) =>
        previous.map((tag) => (tag.id === id ? { ...tag, name: editName.trim() } : tag)),
      );
      setEditingId(null);
      setEditName("");
      toast.success("标签已更新");
    } catch (error) {
      toast.error(error.response?.data?.error || "更新标签失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTag) return;
    setSubmitting(true);
    try {
      await api.delete(`/tags/${deleteTag.id}`);
      setTags((previous) => previous.filter((tag) => tag.id !== deleteTag.id));
      toast.success("标签已删除");
      setDeleteTag(null);
    } catch {
      toast.error("删除标签失败");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTags = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return tags.filter((tag) => {
      const keywordMatch = String(tag.name || "")
        .toLowerCase()
        .includes(keyword);
      if (!keywordMatch) return false;
      if (selectedSection === "all") return true;
      const sectionKey = String(
        tag.section || tag.type || tag.resource_type || "",
      ).toLowerCase();
      return sectionKey === selectedSection;
    });
  }, [search, selectedSection, tags]);

  const startEdit = (tag) => {
    setEditingId(tag.id);
    setEditName(tag.name);
  };

  if (loading) {
    return <AdminLoadingState text="正在加载标签..." />;
  }

  return (
    <>
      <AdminPageShell
        title="标签管理"
        description="统一维护内容标签字典，并按需同步各资源里的引用计数。"
        actions={
          <>
            <AdminButton tone="subtle" disabled={syncing} onClick={handleSync}>
              <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
              {syncing ? "同步中..." : "同步计数"}
            </AdminButton>
            <AdminButton tone="primary" onClick={() => setNewTagMode(true)}>
              <Plus size={16} />
              新建标签
            </AdminButton>
          </>
        }
        toolbar={
          <AdminToolbar>
            <ToolbarGroup className="flex-1">
              <div className="relative min-w-[260px] flex-1 max-w-md">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="搜索标签"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                className="theme-admin-input w-full rounded-xl py-2.5 pl-10 pr-4"
                />
              </div>
            </ToolbarGroup>
            <ToolbarGroup>
              {SECTION_OPTIONS.map((section) => (
                <FilterChip
                  key={section.id}
                  active={selectedSection === section.id}
                  onClick={() => setSelectedSection(section.id)}
                >
                  {section.label}
                </FilterChip>
              ))}
            </ToolbarGroup>
          </AdminToolbar>
        }
      >
        {newTagMode ? (
          <AdminPanel className="border-indigo-500/20 bg-indigo-500/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="text"
                value={newTagName}
                onChange={(event) => setNewTagName(event.target.value)}
                placeholder="输入标签名称"
                    className="theme-admin-input flex-1 rounded-xl p-3"
                autoFocus
                onKeyDown={(event) => event.key === "Enter" && handleCreate()}
              />
              <div className="flex gap-2">
                <AdminButton tone="primary" disabled={submitting} onClick={handleCreate}>
                  <Check size={16} />
                  创建
                </AdminButton>
                <AdminButton
                  tone="subtle"
                  onClick={() => {
                    setNewTagMode(false);
                    setNewTagName("");
                  }}
                >
                  <X size={16} />
                  取消
                </AdminButton>
              </div>
            </div>
          </AdminPanel>
        ) : null}

        <AdminPanel title={`标签列表 (${filteredTags.length})`}>
          {filteredTags.length === 0 ? (
            <AdminEmptyState
              icon={Tag}
              title="没有匹配的标签"
              description="可以清空搜索词、切换资源类型，或者直接新建标签。"
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredTags.map((tag) => (
                <div
                  key={tag.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:bg-white/5"
                >
                  {editingId === tag.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                            className="theme-admin-input flex-1 rounded-xl px-3 py-2 text-sm"
                        autoFocus
                        onKeyDown={(event) =>
                          event.key === "Enter" && handleUpdate(tag.id)
                        }
                      />
                      <button
                        onClick={() => handleUpdate(tag.id)}
                        className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300 transition-colors hover:bg-emerald-500/20"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditName("");
                        }}
                        className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl bg-white/5 text-gray-300 transition-colors hover:bg-white/10"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-base font-semibold text-white">
                          {tag.name}
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          引用数 {tag.count || 0}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEdit(tag)}
                          className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg bg-white/5 text-gray-400 transition-colors hover:bg-white/10 hover:text-indigo-300"
                          title="编辑标签"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteTag(tag)}
                          className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg bg-white/5 text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                          title="删除标签"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </AdminPanel>
      </AdminPageShell>

      <ConfirmDialog
        open={Boolean(deleteTag)}
        title="确认删除标签"
        description={
          deleteTag
            ? `删除“${deleteTag.name}”后，会同时从相关资源的标签字段中移除该标签。`
            : ""
        }
        confirmText="确认删除"
        tone="danger"
        pending={submitting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTag(null)}
      />
    </>
  );
};

export default TagManager;
