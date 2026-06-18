import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Edit2,
  Key,
  LockKeyhole,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import api from "../../services/api";
import {
  AdminButton,
  AdminEmptyState,
  AdminIconButton,
  AdminInlineNote,
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

const getUserRoleGroup = (role) => (role === "admin" ? "admin" : "user");

const normalizeSearchText = (value) => String(value ?? "").trim().toLowerCase();

const roleSearchAliases = {
  admin: "admin administrator manager shield 管理员 管理",
  user: "user member student normal 普通用户 用户 普通",
};

const EDIT_ROLE_INPUT_ID = "admin-user-edit-role";
const EDIT_PASSWORD_INPUT_ID = "admin-user-edit-password";

const getUserInitial = (username) =>
  String(username || "?").trim().charAt(0).toUpperCase() || "?";

const getDisplayName = (user, fallback) => user?.username || fallback;

const getRoleBadgeClassName = (roleGroup, isDayMode) => {
  if (roleGroup === "admin") {
    return isDayMode
      ? "border-violet-500/[0.18] bg-violet-500/10 text-violet-700"
      : "border-violet-500/20 bg-violet-500/15 text-violet-300";
  }

  return isDayMode
    ? "border-slate-300/70 bg-slate-100 text-slate-600"
    : "border-white/10 bg-white/5 text-gray-300";
};

const formatCreatedAt = (value, language) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat(
    String(language || "zh").startsWith("en") ? "en-US" : "zh-CN",
    { dateStyle: "medium" },
  ).format(date);
};

const UserManager = () => {
  const { t, i18n } = useTranslation();
  const { isDayMode, mutedTextClass, subtleTextClass } = useAdminTheme();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editingUser, setEditingUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchUsers = async ({ preserveCurrent = false } = {}) => {
    const shouldRefreshInPlace = preserveCurrent || users.length > 0;

    try {
      setLoading(!shouldRefreshInPlace);
      setRefreshing(shouldRefreshInPlace);
      const response = await api.get("/admin/users");
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      const errorMessage =
        error.response?.status === 403
          ? t("admin.user_manager_ui.error_forbidden")
          : error.response?.status === 401
            ? t("admin.user_manager_ui.error_unauthorized")
            : t("admin.user_manager_ui.error_load");
      toast.error(errorMessage);
      if (!shouldRefreshInPlace) setUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const searchTerm = normalizeSearchText(searchQuery);
  const hasSearch = searchTerm.length > 0;

  const searchMatchedUsers = useMemo(() => {
    if (!searchTerm) return users;

    return users.filter((user) => {
      const roleGroup = getUserRoleGroup(user.role);
      const searchableText = [
        user.id,
        user.username,
        user.nickname,
        user.email,
        user.role,
        roleGroup,
        roleSearchAliases[roleGroup],
      ]
        .filter(Boolean)
        .map(normalizeSearchText)
        .join(" ");

      return searchableText.includes(searchTerm);
    });
  }, [searchTerm, users]);

  const filteredUsers = useMemo(
    () =>
      searchMatchedUsers.filter(
        (user) =>
          roleFilter === "all" || getUserRoleGroup(user.role) === roleFilter,
      ),
    [roleFilter, searchMatchedUsers],
  );

  const totalCounts = useMemo(
    () => ({
      total: users.length,
      admin: users.filter((user) => getUserRoleGroup(user.role) === "admin")
        .length,
      user: users.filter((user) => getUserRoleGroup(user.role) === "user")
        .length,
    }),
    [users],
  );

  const searchCounts = useMemo(
    () => ({
      total: searchMatchedUsers.length,
      admin: searchMatchedUsers.filter(
        (user) => getUserRoleGroup(user.role) === "admin",
      ).length,
      user: searchMatchedUsers.filter(
        (user) => getUserRoleGroup(user.role) === "user",
      ).length,
    }),
    [searchMatchedUsers],
  );

  const roleTabs = useMemo(
    () => [
      {
        key: "all",
        label: t("admin.user_manager_ui.filter_all"),
        icon: Users,
        total: totalCounts.total,
        matched: searchCounts.total,
      },
      {
        key: "admin",
        label: t("admin.user_manager_ui.role_admin"),
        icon: ShieldCheck,
        total: totalCounts.admin,
        matched: searchCounts.admin,
      },
      {
        key: "user",
        label: t("admin.user_manager_ui.role_user"),
        icon: User,
        total: totalCounts.user,
        matched: searchCounts.user,
      },
    ],
    [searchCounts, t, totalCounts],
  );

  const activeRoleTotal =
    roleFilter === "all" ? totalCounts.total : totalCounts[roleFilter];
  const activeRoleMatched =
    roleFilter === "all" ? searchCounts.total : searchCounts[roleFilter];
  const hasActiveFilter = hasSearch || roleFilter !== "all";
  const currentLanguage = i18n.resolvedLanguage || i18n.language || "zh";
  const editingRoleGroup = editingUser
    ? getUserRoleGroup(editingUser.role)
    : "user";
  const roleChanged = Boolean(editingUser) && newRole !== editingRoleGroup;
  const trimmedPassword = newPassword.trim();
  const passwordChanged = trimmedPassword.length > 0;
  const passwordTooShort = passwordChanged && trimmedPassword.length < 6;
  const hasEditableChange = roleChanged || passwordChanged;

  const listDescription = hasSearch
    ? t("admin.user_manager_ui.result_summary_search", {
        shown: filteredUsers.length,
        activeMatched: activeRoleMatched,
        activeTotal: activeRoleTotal,
        searchMatched: searchCounts.total,
        total: totalCounts.total,
        query: searchQuery.trim(),
      })
    : t("admin.user_manager_ui.result_summary", {
        shown: filteredUsers.length,
        total: activeRoleTotal,
      });

  const clearFilters = () => {
    setSearchQuery("");
    setRoleFilter("all");
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setNewRole(getUserRoleGroup(user.role));
    setNewPassword("");
    setIsModalOpen(true);
  };

  const closeEditDialog = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setNewPassword("");
    setNewRole("user");
  };

  const handleSave = async () => {
    if (!editingUser || !hasEditableChange || passwordTooShort) return;

    const payload = {};
    if (roleChanged) payload.role = newRole;
    if (passwordChanged) payload.password = trimmedPassword;

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
      toast.success(t("admin.user_manager_ui.update_success"));
      closeEditDialog();
    } catch (error) {
      toast.error(
        error.response?.data?.error || t("admin.user_manager_ui.update_fail"),
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!confirmDeleteUser?.id) return;

    setSaving(true);
    try {
      await api.delete(`/admin/users/${confirmDeleteUser.id}`);
      setUsers((previous) =>
        previous.filter((user) => user.id !== confirmDeleteUser.id),
      );
      toast.success(t("admin.user_manager_ui.delete_success"));
      setConfirmDeleteUser(null);
    } catch (error) {
      toast.error(
        error.response?.data?.error || t("admin.user_manager_ui.delete_fail"),
      );
    } finally {
      setSaving(false);
    }
  };

  const renderRoleBadge = (role) => {
    const roleGroup = getUserRoleGroup(role);

    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${getRoleBadgeClassName(
          roleGroup,
          isDayMode,
        )}`}
      >
        {roleGroup === "admin" ? (
          <ShieldCheck size={13} />
        ) : (
          <User size={13} />
        )}
        {roleGroup === "admin"
          ? t("admin.user_manager_ui.role_admin")
          : t("admin.user_manager_ui.role_user")}
      </span>
    );
  };

  const renderUserIdentity = (user) => (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-sm font-bold ${
          isDayMode
            ? "bg-indigo-100 text-indigo-600"
            : "bg-indigo-500/15 text-indigo-300"
        }`}
      >
        {getUserInitial(user.username)}
      </div>
      <div className="min-w-0">
        <AdminTableCellText strong className="block truncate">
          {getDisplayName(user, t("admin.user_manager_ui.unnamed_user"))}
        </AdminTableCellText>
        <div className={`mt-1 text-xs tabular-nums ${mutedTextClass}`}>
          {t("admin.user_manager_ui.user_id", { id: user.id })}
        </div>
      </div>
    </div>
  );

  const renderMobileCards = () => (
    <div className="grid grid-cols-1 gap-3 md:hidden">
      {filteredUsers.map((user) => (
        <article
          key={user.id}
          className={`rounded-[8px] border p-4 ${
            isDayMode
              ? "border-slate-200/70 bg-white/[0.78]"
              : "border-white/10 bg-white/[0.03]"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            {renderUserIdentity(user)}
            {renderRoleBadge(user.role)}
          </div>
          <div
            className={`mt-3 flex items-center justify-between text-xs ${mutedTextClass}`}
          >
            <span>{t("admin.user_manager_ui.created_at")}</span>
            <span>{formatCreatedAt(user.created_at, currentLanguage)}</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <AdminButton tone="subtle" onClick={() => handleEdit(user)}>
              <Edit2 size={16} />
              {t("admin.user_manager_ui.edit")}
            </AdminButton>
            <AdminButton tone="danger" onClick={() => setConfirmDeleteUser(user)}>
              <Trash2 size={16} />
              {t("admin.user_manager_ui.delete")}
            </AdminButton>
          </div>
        </article>
      ))}
    </div>
  );

  if (loading) {
    return (
      <AdminLoadingState text={t("admin.user_manager_ui.loading_users")} />
    );
  }

  return (
    <>
      <AdminPageShell
        title={t("admin.user_manager_ui.title")}
        description={t("admin.user_manager_ui.description")}
        actions={
          <AdminButton
            tone="subtle"
            onClick={() => fetchUsers({ preserveCurrent: true })}
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            {refreshing
              ? t("admin.user_manager_ui.refreshing")
              : t("admin.user_manager_ui.refresh")}
          </AdminButton>
        }
        toolbar={
          <AdminToolbar>
            <ToolbarGroup className="w-full flex-1">
              <div className="relative w-full min-w-0 flex-1 md:max-w-lg">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  type="text"
                  placeholder={t("admin.user_manager_ui.search_placeholder")}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="theme-admin-input w-full rounded-[8px] py-2.5 pl-10 pr-11"
                  aria-label={t("admin.user_manager_ui.search_aria")}
                />
                {searchQuery ? (
                  <button
                    type="button"
                    className={`absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md transition-colors ${
                      isDayMode
                        ? "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                        : "text-gray-400 hover:bg-white/10 hover:text-white"
                    }`}
                    aria-label={t("admin.user_manager_ui.clear_search")}
                    title={t("admin.user_manager_ui.clear_search")}
                    onClick={() => setSearchQuery("")}
                  >
                    <X size={15} />
                  </button>
                ) : null}
              </div>
            </ToolbarGroup>
            <ToolbarGroup className="w-full xl:w-auto">
              {roleTabs.map(({ key, label, icon: Icon, total, matched }) => (
                <FilterChip
                  key={key}
                  active={roleFilter === key}
                  onClick={() => setRoleFilter(key)}
                  className="flex min-w-[118px] items-center justify-between gap-3"
                  aria-pressed={roleFilter === key}
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <Icon size={15} />
                    <span className="truncate">{label}</span>
                  </span>
                  <span className="shrink-0 text-xs font-bold tabular-nums">
                    {hasSearch ? `${matched} / ${total}` : total}
                  </span>
                </FilterChip>
              ))}
            </ToolbarGroup>
          </AdminToolbar>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <AdminMetricCard
            label={t("admin.user_manager_ui.metric_total")}
            value={totalCounts.total}
            icon={Users}
            helper={
              hasSearch
                ? t("admin.user_manager_ui.metric_search_helper", {
                    count: searchCounts.total,
                  })
                : undefined
            }
          />
          <AdminMetricCard
            label={t("admin.user_manager_ui.metric_admin")}
            value={totalCounts.admin}
            icon={ShieldCheck}
            helper={
              hasSearch
                ? t("admin.user_manager_ui.metric_search_helper", {
                    count: searchCounts.admin,
                  })
                : undefined
            }
            tone="violet"
          />
          <AdminMetricCard
            label={t("admin.user_manager_ui.metric_user")}
            value={totalCounts.user}
            icon={User}
            helper={
              hasSearch
                ? t("admin.user_manager_ui.metric_search_helper", {
                    count: searchCounts.user,
                  })
                : undefined
            }
            tone="emerald"
          />
        </div>

        <AdminPanel
          title={t("admin.user_manager_ui.list_title", {
            count: filteredUsers.length,
          })}
          description={listDescription}
          action={
            hasActiveFilter ? (
              <AdminButton tone="subtle" onClick={clearFilters}>
                <X size={16} />
                {t("admin.user_manager_ui.clear_filters")}
              </AdminButton>
            ) : null
          }
        >
          {hasSearch ? (
            <AdminInlineNote tone="info" className="mb-3">
              {t("admin.user_manager_ui.search_notice", {
                query: searchQuery.trim(),
                matched: searchCounts.total,
                total: totalCounts.total,
              })}
            </AdminInlineNote>
          ) : null}

          {filteredUsers.length === 0 ? (
            <AdminEmptyState
              icon={Users}
              title={t("admin.user_manager_ui.empty_title")}
              description={t("admin.user_manager_ui.empty_desc")}
              action={
                hasActiveFilter ? (
                  <AdminButton tone="subtle" onClick={clearFilters}>
                    <X size={16} />
                    {t("admin.user_manager_ui.clear_filters")}
                  </AdminButton>
                ) : null
              }
            />
          ) : (
            <>
              {renderMobileCards()}
              <AdminTableShell minWidth={760}>
                <thead>
                  <tr className="theme-admin-table-head border-b text-xs uppercase tracking-[0.16em]">
                    <th className="p-4">
                      {t("admin.user_manager_ui.col_user")}
                    </th>
                    <th className="p-4">
                      {t("admin.user_manager_ui.col_role")}
                    </th>
                    <th className="p-4">
                      {t("admin.user_manager_ui.col_created")}
                    </th>
                    <th className="p-4 text-right">
                      {t("admin.user_manager_ui.col_actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="theme-admin-table-body divide-y">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="theme-admin-row">
                      <td className="p-4">{renderUserIdentity(user)}</td>
                      <td className="p-4">{renderRoleBadge(user.role)}</td>
                      <td className={`p-4 ${mutedTextClass}`}>
                        {formatCreatedAt(user.created_at, currentLanguage)}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <AdminIconButton
                            onClick={() => handleEdit(user)}
                            label={t("admin.user_manager_ui.edit_user")}
                          >
                            <Edit2 size={16} />
                          </AdminIconButton>
                          <AdminIconButton
                            onClick={() => setConfirmDeleteUser(user)}
                            label={t("admin.user_manager_ui.delete_user")}
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
        title={t("admin.user_manager_ui.edit_title")}
        description={t("admin.user_manager_ui.edit_desc")}
        confirmText={t("admin.user_manager_ui.save_changes")}
        cancelText={t("admin.user_manager_ui.cancel")}
        pendingText={t("admin.user_manager_ui.saving")}
        tone="primary"
        pending={saving}
        confirmDisabled={!hasEditableChange || passwordTooShort}
        onConfirm={handleSave}
        onCancel={closeEditDialog}
      >
        <div className="space-y-4">
          <div
            className={`rounded-[8px] border p-3 ${
              isDayMode
                ? "border-slate-200 bg-slate-50"
                : "border-white/10 bg-white/[0.03]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              {editingUser ? renderUserIdentity(editingUser) : null}
              {editingUser ? renderRoleBadge(editingUser.role) : null}
            </div>
            <p className={`mt-3 text-xs leading-5 ${mutedTextClass}`}>
              {t("admin.user_manager_ui.edit_target_note", {
                username: getDisplayName(
                  editingUser,
                  t("admin.user_manager_ui.unnamed_user"),
                ),
              })}
            </p>
          </div>

          <div>
            <label
              htmlFor={EDIT_ROLE_INPUT_ID}
              className={`mb-2 block text-sm font-medium ${subtleTextClass}`}
            >
              {t("admin.user_manager_ui.role_field")}
            </label>
            <select
              id={EDIT_ROLE_INPUT_ID}
              value={newRole}
              onChange={(event) => setNewRole(event.target.value)}
              className="theme-admin-input w-full rounded-[8px] p-3"
            >
              <option value="user">
                {t("admin.user_manager_ui.role_user")}
              </option>
              <option value="admin">
                {t("admin.user_manager_ui.role_admin")}
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor={EDIT_PASSWORD_INPUT_ID}
              className={`mb-2 flex items-center gap-2 text-sm font-medium ${subtleTextClass}`}
            >
              <LockKeyhole size={14} />
              {t("admin.user_manager_ui.password_field")}
            </label>
            <input
              id={EDIT_PASSWORD_INPUT_ID}
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder={t("admin.user_manager_ui.password_placeholder")}
              className="theme-admin-input w-full rounded-[8px] p-3"
              autoComplete="new-password"
            />
            <p
              className={`mt-2 flex items-center gap-1.5 text-xs ${
                passwordTooShort
                  ? isDayMode
                    ? "text-rose-700"
                    : "text-rose-300"
                  : mutedTextClass
              }`}
            >
              {passwordTooShort ? <AlertTriangle size={13} /> : <Key size={13} />}
              {passwordTooShort
                ? t("admin.user_manager_ui.password_too_short")
                : t("admin.user_manager_ui.password_hint")}
            </p>
          </div>

          <AdminInlineNote tone="warning">
            <span className="font-semibold">
              {t("admin.user_manager_ui.password_scope_title")}
            </span>
            <span className="mt-1 block">
              {t("admin.user_manager_ui.password_scope_desc", {
                username: getDisplayName(
                  editingUser,
                  t("admin.user_manager_ui.unnamed_user"),
                ),
              })}
            </span>
          </AdminInlineNote>

          {!hasEditableChange ? (
            <p className={`text-xs ${mutedTextClass}`}>
              {t("admin.user_manager_ui.no_changes")}
            </p>
          ) : null}
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(confirmDeleteUser)}
        title={t("admin.user_manager_ui.delete_title")}
        description={t("admin.user_manager_ui.delete_desc", {
          username: getDisplayName(
            confirmDeleteUser,
            t("admin.user_manager_ui.unnamed_user"),
          ),
        })}
        confirmText={t("admin.user_manager_ui.delete_confirm")}
        cancelText={t("admin.user_manager_ui.cancel")}
        pendingText={t("admin.user_manager_ui.deleting")}
        tone="danger"
        pending={saving}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteUser(null)}
      />
    </>
  );
};

export default UserManager;
