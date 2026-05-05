import React, { useEffect, useMemo, useState } from "react";
import { Search, Trash2, Edit2, User, Key, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";
import {
  AdminButton,
  AdminEmptyState,
  AdminLoadingState,
  AdminMetricCard,
  AdminPageShell,
  AdminPanel,
  AdminIconButton,
  AdminTableCellText,
  AdminTableShell,
  AdminToolbar,
  ConfirmDialog,
  FilterChip,
  ToolbarGroup,
  useAdminTheme,
} from "./AdminUI";

const UserManager = () => {
  const { isDayMode, mutedTextClass } = useAdminTheme();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editingUser, setEditingUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/users");
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      const errorMessage =
        error.response?.status === 403
          ? "没有权限访问用户管理"
          : error.response?.status === 401
            ? "请先登录管理员账号"
            : "获取用户列表失败";
      toast.error(errorMessage);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const lowerQuery = searchQuery.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !lowerQuery ||
        String(user.username || "")
          .toLowerCase()
          .includes(lowerQuery);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [roleFilter, searchQuery, users]);

  const counts = useMemo(
    () => ({
      total: users.length,
      admin: users.filter((user) => user.role === "admin").length,
      user: users.filter((user) => user.role !== "admin").length,
    }),
    [users],
  );

  const handleEdit = (user) => {
    setEditingUser(user);
    setNewRole(user.role);
    setNewPassword("");
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingUser) return;
    const payload = {};
    if (newRole !== editingUser.role) payload.role = newRole;
    if (newPassword.trim()) payload.password = newPassword.trim();

    if (Object.keys(payload).length === 0) {
      setIsModalOpen(false);
      return;
    }

    setSaving(true);
    try {
      await api.put(`/admin/users/${editingUser.id}`, payload);
      setUsers((previous) =>
        previous.map((user) =>
          user.id === editingUser.id
            ? { ...user, role: payload.role || user.role }
            : user,
        ),
      );
      toast.success("用户信息已更新");
      setIsModalOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.error || "更新用户失败");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    setSaving(true);
    try {
      await api.delete(`/admin/users/${confirmDeleteId}`);
      setUsers((previous) =>
        previous.filter((user) => user.id !== confirmDeleteId),
      );
      toast.success("用户已删除");
      setConfirmDeleteId(null);
    } catch (error) {
      toast.error(error.response?.data?.error || "删除用户失败");
    } finally {
      setSaving(false);
    }
  };

  const renderMobileCards = () => (
    <div className="grid grid-cols-1 gap-3 md:hidden">
      {filteredUsers.map((user) => (
        <article
          key={user.id}
          className={`rounded-2xl border p-4 ${
            isDayMode
              ? "border-slate-200/70 bg-white/[0.78]"
              : "border-white/10 bg-white/[0.03]"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                isDayMode
                  ? "bg-indigo-100 text-indigo-600"
                  : "bg-indigo-500/15 text-indigo-300"
              }`}
            >
              {String(user.username || "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <AdminTableCellText strong>
                  {user.username || "未命名用户"}
                </AdminTableCellText>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    user.role === "admin"
                      ? isDayMode
                        ? "bg-violet-500/10 text-violet-700"
                        : "bg-violet-500/15 text-violet-300"
                      : isDayMode
                        ? "bg-slate-100 text-slate-600"
                        : "bg-white/5 text-gray-300"
                  }`}
                >
                  {user.role === "admin" ? "管理员" : "普通用户"}
                </span>
              </div>
              <div className={`mt-2 text-xs ${mutedTextClass}`}>
                ID {user.id} ·{" "}
                {user.created_at
                  ? new Date(user.created_at).toLocaleDateString("zh-CN")
                  : "未记录创建时间"}
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <AdminButton tone="subtle" onClick={() => handleEdit(user)}>
              <Edit2 size={16} />
              编辑
            </AdminButton>
            <AdminButton
              tone="danger"
              onClick={() => setConfirmDeleteId(user.id)}
            >
              <Trash2 size={16} />
              删除
            </AdminButton>
          </div>
        </article>
      ))}
    </div>
  );

  if (loading) {
    return <AdminLoadingState text="正在加载用户列表..." />;
  }

  return (
    <>
      <AdminPageShell
        title="用户管理"
        description="查看站内用户、调整角色并按需重置密码。当前后端只支持管理员/普通用户两类角色。"
        actions={
          <AdminButton tone="subtle" onClick={fetchUsers}>
            <RefreshCw size={16} />
            刷新
          </AdminButton>
        }
        toolbar={
          <AdminToolbar>
            <ToolbarGroup className="w-full flex-1">
              <div className="relative w-full min-w-0 flex-1 md:max-w-md">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  type="text"
                  placeholder="搜索用户名"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="theme-admin-input w-full rounded-xl py-2.5 pl-10 pr-4"
                />
              </div>
            </ToolbarGroup>
            <ToolbarGroup>
              <FilterChip
                active={roleFilter === "all"}
                onClick={() => setRoleFilter("all")}
              >
                全部 ({counts.total})
              </FilterChip>
              <FilterChip
                active={roleFilter === "admin"}
                onClick={() => setRoleFilter("admin")}
              >
                管理员 ({counts.admin})
              </FilterChip>
              <FilterChip
                active={roleFilter === "user"}
                onClick={() => setRoleFilter("user")}
              >
                普通用户 ({counts.user})
              </FilterChip>
            </ToolbarGroup>
          </AdminToolbar>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <AdminMetricCard label="总用户数" value={counts.total} icon={User} />
          <AdminMetricCard
            label="管理员"
            value={counts.admin}
            icon={Key}
            tone="violet"
          />
          <AdminMetricCard
            label="普通用户"
            value={counts.user}
            icon={User}
            tone="emerald"
          />
        </div>

        <AdminPanel title={`用户列表 (${filteredUsers.length})`}>
          {filteredUsers.length === 0 ? (
            <AdminEmptyState
              icon={User}
              title="没有匹配的用户"
              description="可以清空搜索词或切换角色筛选。"
            />
          ) : (
            <>
              {renderMobileCards()}
              <AdminTableShell minWidth={720}>
                <thead>
                  <tr className="theme-admin-table-head border-b text-xs uppercase tracking-[0.2em]">
                    <th className="p-4">用户</th>
                    <th className="p-4">角色</th>
                    <th className="p-4">创建时间</th>
                    <th className="p-4 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="theme-admin-table-body divide-y">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="theme-admin-row">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full ${
                              isDayMode
                                ? "bg-indigo-100 text-indigo-600"
                                : "bg-indigo-500/15 text-indigo-300"
                            }`}
                          >
                            {String(user.username || "?")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <div>
                            <AdminTableCellText strong>
                              {user.username}
                            </AdminTableCellText>
                            <div className={`mt-1 text-xs ${mutedTextClass}`}>
                              ID {user.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            user.role === "admin"
                              ? isDayMode
                                ? "bg-violet-500/10 text-violet-700"
                                : "bg-violet-500/15 text-violet-300"
                              : isDayMode
                                ? "bg-slate-100 text-slate-600"
                                : "bg-white/5 text-gray-300"
                          }`}
                        >
                          {user.role === "admin" ? "管理员" : "普通用户"}
                        </span>
                      </td>
                      <td className={`p-4 ${mutedTextClass}`}>
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString(
                              "zh-CN",
                            )
                          : "-"}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <AdminIconButton
                            onClick={() => handleEdit(user)}
                            label="编辑用户"
                          >
                            <Edit2 size={16} />
                          </AdminIconButton>
                          <AdminIconButton
                            onClick={() => setConfirmDeleteId(user.id)}
                            label="删除用户"
                            tone="danger"
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
        open={isModalOpen}
        title="编辑用户"
        description="可以调整用户角色，或为该用户直接重置密码。"
        confirmText="保存修改"
        tone="primary"
        pending={saving}
        onConfirm={handleSave}
        onCancel={() => setIsModalOpen(false)}
      >
        <div className="space-y-4">
          <div>
            <label className={`mb-2 block text-sm font-medium ${mutedTextClass}`}>
              用户名
            </label>
            <input
              type="text"
              value={editingUser?.username || ""}
              disabled
              className={`theme-admin-input w-full rounded-xl p-3 ${mutedTextClass}`}
            />
          </div>
          <div>
            <label className={`mb-2 block text-sm font-medium ${mutedTextClass}`}>
              角色
            </label>
            <select
              value={newRole}
              onChange={(event) => setNewRole(event.target.value)}
              className="theme-admin-input w-full rounded-xl p-3"
            >
              <option value="user">普通用户</option>
              <option value="admin">管理员</option>
            </select>
          </div>
          <div>
            <label className={`mb-2 flex items-center gap-2 text-sm font-medium ${mutedTextClass}`}>
              <Key size={14} />
              新密码
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="留空则不修改"
              className="theme-admin-input w-full rounded-xl p-3"
            />
            <p className={`mt-2 text-xs ${mutedTextClass}`}>密码至少 6 位。</p>
          </div>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(confirmDeleteId)}
        title="确认删除用户"
        description="该操作不可撤销。后端会阻止你删除当前登录账号。"
        confirmText="确认删除"
        tone="danger"
        pending={saving}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </>
  );
};

export default UserManager;
