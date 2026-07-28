import React, { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    Building2,
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

const VIEW_KEYS = ["accounts", "organizations", "permissions"];
const ACCOUNT_TYPES = ["personal", "organization"];
const REVIEW_PERMISSIONS = ["normal", "trusted", "admin"];
const ADMIN_SCOPES = ["none", "platform"];

const normalizeSearchText = (value) =>
    String(value ?? "")
        .trim()
        .toLowerCase();
const getUserRoleGroup = (role) => (role === "admin" ? "admin" : "user");
const getAccountType = (user) =>
    user?.account_type || (user?.organization_cr ? "organization" : "personal");
const getReviewPermission = (user) =>
    user?.review_permission || (user?.role === "admin" ? "admin" : "normal");
const getAdminScope = (user) => user?.admin_scope || (user?.role === "admin" ? "platform" : "none");

const roleSearchAliases = {
    admin: "admin administrator manager shield 管理员 管理",
    user: "user member student normal 普通用户 用户 普通",
};

const permissionSearchAliases = {
    normal: "normal review pending 普通 审核",
    trusted: "trusted bypass no-review 免审核 可信",
    admin: "admin platform 管理员 后台",
};

const EDIT_ROLE_INPUT_ID = "admin-user-edit-role";
const EDIT_ACCOUNT_TYPE_INPUT_ID = "admin-user-edit-account-type";
const EDIT_REVIEW_PERMISSION_INPUT_ID = "admin-user-edit-review-permission";
const EDIT_ADMIN_SCOPE_INPUT_ID = "admin-user-edit-admin-scope";
const EDIT_PASSWORD_INPUT_ID = "admin-user-edit-password";

const getUserInitial = (username) =>
    String(username || "?")
        .trim()
        .charAt(0)
        .toUpperCase() || "?";

const getDisplayName = (user, fallback) => user?.nickname || user?.username || fallback;

const formatCreatedAt = (value, language) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat(String(language || "zh").startsWith("en") ? "en-US" : "zh-CN", {
        dateStyle: "medium",
    }).format(date);
};

const UserManager = () => {
    const { t, i18n } = useTranslation();
    const { isDayMode, mutedTextClass, subtleTextClass, headingTextClass } = useAdminTheme();
    const [users, setUsers] = useState([]);
    const [organizations, setOrganizations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [organizationsLoading, setOrganizationsLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeView, setActiveView] = useState("accounts");
    const [roleFilter, setRoleFilter] = useState("all");
    const [permissionFilter, setPermissionFilter] = useState("all");
    const [editingUser, setEditingUser] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newRole, setNewRole] = useState("user");
    const [newAccountType, setNewAccountType] = useState("personal");
    const [newReviewPermission, setNewReviewPermission] = useState("normal");
    const [newAdminScope, setNewAdminScope] = useState("none");
    const [newPassword, setNewPassword] = useState("");
    const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);
    const [saving, setSaving] = useState(false);

    const currentLanguage = i18n.resolvedLanguage || i18n.language || "zh";

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

    const fetchOrganizations = async () => {
        setOrganizationsLoading(true);
        try {
            const response = await api.get("/admin/user-organizations");
            setOrganizations(Array.isArray(response.data?.data) ? response.data.data : []);
        } catch (error) {
            toast.error(
                error.response?.data?.error || t("admin.user_manager_ui.error_load_organizations")
            );
            setOrganizations([]);
        } finally {
            setOrganizationsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchOrganizations();
    }, []);

    const searchTerm = normalizeSearchText(searchQuery);
    const hasSearch = searchTerm.length > 0;

    const searchedUsers = useMemo(() => {
        if (!searchTerm) return users;
        return users.filter((user) => {
            const roleGroup = getUserRoleGroup(user.role);
            const reviewPermission = getReviewPermission(user);
            const searchableText = [
                user.id,
                user.username,
                user.nickname,
                user.role,
                roleGroup,
                roleSearchAliases[roleGroup],
                getAccountType(user),
                reviewPermission,
                permissionSearchAliases[reviewPermission],
                user.organization_cr,
                user.managed_profile_count,
                user.organization_profile_count,
            ]
                .filter(Boolean)
                .map(normalizeSearchText)
                .join(" ");
            return searchableText.includes(searchTerm);
        });
    }, [searchTerm, users]);

    const filteredUsers = useMemo(
        () =>
            searchedUsers.filter((user) => {
                const roleMatches =
                    roleFilter === "all" || getUserRoleGroup(user.role) === roleFilter;
                const permissionMatches =
                    permissionFilter === "all" || getReviewPermission(user) === permissionFilter;
                return roleMatches && permissionMatches;
            }),
        [permissionFilter, roleFilter, searchedUsers]
    );

    const filteredOrganizations = useMemo(() => {
        if (!searchTerm) return organizations;
        return organizations.filter((organization) => {
            const searchableText = [
                organization.display_name,
                organization.display_name_en,
                organization.handle,
                organization.type,
                organization.partner?.partner_scope,
                organization.partner?.name,
                ...(organization.members || []).map(
                    (member) => `${member.username} ${member.nickname} ${member.user_id}`
                ),
            ]
                .filter(Boolean)
                .map(normalizeSearchText)
                .join(" ");
            return searchableText.includes(searchTerm);
        });
    }, [organizations, searchTerm]);

    const totalCounts = useMemo(
        () => ({
            total: users.length,
            admin: users.filter((user) => getUserRoleGroup(user.role) === "admin").length,
            user: users.filter((user) => getUserRoleGroup(user.role) === "user").length,
            trusted: users.filter((user) => getReviewPermission(user) === "trusted").length,
            normal: users.filter((user) => getReviewPermission(user) === "normal").length,
            organizationAccounts: users.filter((user) => getAccountType(user) === "organization")
                .length,
            pendingContent: users.reduce(
                (sum, user) => sum + (Number(user.pending_content_count) || 0),
                0
            ),
        }),
        [users]
    );

    const organizationStats = useMemo(
        () => ({
            total: organizations.length,
            core: organizations.filter((item) => item.partner?.partner_scope === "core_partner")
                .length,
            activity: organizations.filter(
                (item) => item.partner?.partner_scope === "activity_provider"
            ).length,
            members: organizations.reduce((sum, item) => sum + (Number(item.member_count) || 0), 0),
        }),
        [organizations]
    );

    const roleTabs = [
        {
            key: "all",
            label: t("admin.user_manager_ui.filter_all"),
            icon: Users,
            total: totalCounts.total,
        },
        {
            key: "admin",
            label: t("admin.user_manager_ui.role_admin"),
            icon: ShieldCheck,
            total: totalCounts.admin,
        },
        {
            key: "user",
            label: t("admin.user_manager_ui.role_user"),
            icon: User,
            total: totalCounts.user,
        },
    ];

    const permissionTabs = [
        { key: "all", label: t("admin.user_manager_ui.permission_all"), total: users.length },
        {
            key: "normal",
            label: t("admin.user_manager_ui.review_permission.normal"),
            total: totalCounts.normal,
        },
        {
            key: "trusted",
            label: t("admin.user_manager_ui.review_permission.trusted"),
            total: totalCounts.trusted,
        },
        {
            key: "admin",
            label: t("admin.user_manager_ui.review_permission.admin"),
            total: totalCounts.admin,
        },
    ];

    const activeRoleTotal = roleFilter === "all" ? totalCounts.total : totalCounts[roleFilter];
    const hasActiveFilter = hasSearch || roleFilter !== "all" || permissionFilter !== "all";
    const listDescription = hasSearch
        ? t("admin.user_manager_ui.result_summary_search", {
              shown: filteredUsers.length,
              activeMatched: filteredUsers.length,
              activeTotal: activeRoleTotal,
              searchMatched: searchedUsers.length,
              total: totalCounts.total,
              query: searchQuery.trim(),
          })
        : t("admin.user_manager_ui.result_summary", {
              shown: filteredUsers.length,
              total: activeRoleTotal,
          });

    const editingRoleGroup = editingUser ? getUserRoleGroup(editingUser.role) : "user";
    const editingAccountType = editingUser ? getAccountType(editingUser) : "personal";
    const editingReviewPermission = editingUser ? getReviewPermission(editingUser) : "normal";
    const editingAdminScope = editingUser ? getAdminScope(editingUser) : "none";
    const roleChanged = Boolean(editingUser) && newRole !== editingRoleGroup;
    const accountTypeChanged = Boolean(editingUser) && newAccountType !== editingAccountType;
    const reviewPermissionChanged =
        Boolean(editingUser) && newReviewPermission !== editingReviewPermission;
    const adminScopeChanged = Boolean(editingUser) && newAdminScope !== editingAdminScope;
    const trimmedPassword = newPassword.trim();
    const passwordChanged = trimmedPassword.length > 0;
    const passwordTooShort = passwordChanged && trimmedPassword.length < 6;
    const hasEditableChange =
        roleChanged ||
        accountTypeChanged ||
        reviewPermissionChanged ||
        adminScopeChanged ||
        passwordChanged;

    const clearFilters = () => {
        setSearchQuery("");
        setRoleFilter("all");
        setPermissionFilter("all");
    };

    const refreshAll = () => {
        fetchUsers({ preserveCurrent: true });
        fetchOrganizations();
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        setNewRole(getUserRoleGroup(user.role));
        setNewAccountType(getAccountType(user));
        setNewReviewPermission(getReviewPermission(user));
        setNewAdminScope(getAdminScope(user));
        setNewPassword("");
        setIsModalOpen(true);
    };

    const closeEditDialog = () => {
        setIsModalOpen(false);
        setEditingUser(null);
        setNewPassword("");
        setNewRole("user");
        setNewAccountType("personal");
        setNewReviewPermission("normal");
        setNewAdminScope("none");
    };

    const handleSave = async () => {
        if (!editingUser || !hasEditableChange || passwordTooShort) return;
        const payload = {};
        if (roleChanged) payload.role = newRole;
        if (accountTypeChanged) payload.account_type = newAccountType;
        if (reviewPermissionChanged) payload.review_permission = newReviewPermission;
        if (adminScopeChanged) payload.admin_scope = newAdminScope;
        if (passwordChanged) payload.password = trimmedPassword;

        setSaving(true);
        try {
            await api.put(`/admin/users/${editingUser.id}`, payload);
            setUsers((previous) =>
                previous.map((user) =>
                    user.id === editingUser.id
                        ? {
                              ...user,
                              role: payload.role || user.role,
                              account_type: payload.account_type || user.account_type,
                              review_permission:
                                  payload.review_permission || user.review_permission,
                              admin_scope: payload.admin_scope || user.admin_scope,
                          }
                        : user
                )
            );
            toast.success(t("admin.user_manager_ui.update_success"));
            closeEditDialog();
        } catch (error) {
            toast.error(error.response?.data?.error || t("admin.user_manager_ui.update_fail"));
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!confirmDeleteUser?.id) return;
        setSaving(true);
        try {
            await api.delete(`/admin/users/${confirmDeleteUser.id}`);
            setUsers((previous) => previous.filter((user) => user.id !== confirmDeleteUser.id));
            toast.success(t("admin.user_manager_ui.delete_success"));
            setConfirmDeleteUser(null);
        } catch (error) {
            toast.error(error.response?.data?.error || t("admin.user_manager_ui.delete_fail"));
        } finally {
            setSaving(false);
        }
    };

    const badgeClass = (tone) => {
        const map = {
            violet: isDayMode
                ? "border-violet-500/[0.18] bg-violet-500/10 text-violet-700"
                : "border-violet-500/20 bg-violet-500/15 text-violet-300",
            emerald: isDayMode
                ? "border-emerald-500/[0.18] bg-emerald-500/10 text-emerald-700"
                : "border-emerald-500/20 bg-emerald-500/15 text-emerald-300",
            amber: isDayMode
                ? "border-amber-500/[0.18] bg-amber-500/10 text-amber-700"
                : "border-amber-500/20 bg-amber-500/15 text-amber-300",
            slate: isDayMode
                ? "border-slate-300/70 bg-slate-100 text-slate-600"
                : "border-white/10 bg-white/5 text-gray-300",
            sky: isDayMode
                ? "border-sky-500/[0.18] bg-sky-500/10 text-sky-700"
                : "border-sky-500/20 bg-sky-500/15 text-sky-300",
        };
        return map[tone] || map.slate;
    };

    const renderBadge = (children, tone = "slate", Icon = null) => (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass(tone)}`}
        >
            {Icon ? <Icon size={13} /> : null}
            {children}
        </span>
    );

    const renderRoleBadge = (role) => {
        const roleGroup = getUserRoleGroup(role);
        return renderBadge(
            roleGroup === "admin"
                ? t("admin.user_manager_ui.role_admin")
                : t("admin.user_manager_ui.role_user"),
            roleGroup === "admin" ? "violet" : "slate",
            roleGroup === "admin" ? ShieldCheck : User
        );
    };

    const renderAccountTypeBadge = (user) => {
        const accountType = getAccountType(user);
        return renderBadge(
            t(`admin.user_manager_ui.account_type.${accountType}`),
            accountType === "organization" ? "sky" : "slate",
            accountType === "organization" ? Building2 : User
        );
    };

    const renderPermissionBadge = (user) => {
        const permission = getReviewPermission(user);
        const tone =
            permission === "admin" ? "violet" : permission === "trusted" ? "emerald" : "amber";
        return renderBadge(
            t(`admin.user_manager_ui.review_permission.${permission}`),
            tone,
            ShieldCheck
        );
    };

    const renderUserIdentity = (user) => (
        <div className="flex min-w-0 items-center gap-3">
            <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-sm font-bold ${
                    isDayMode ? "bg-indigo-100 text-indigo-600" : "bg-indigo-500/15 text-indigo-300"
                }`}
            >
                {user.avatar ? (
                    <img
                        src={user.avatar}
                        alt=""
                        className="h-full w-full rounded-md object-cover"
                        loading="lazy"
                    />
                ) : (
                    getUserInitial(user.username)
                )}
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

    const renderMobileAccountCards = () => (
        <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredUsers.map((user) => (
                <article
                    key={user.id}
                    className={`rounded-[8px] border p-4 ${isDayMode ? "border-slate-200/70 bg-white/[0.78]" : "border-white/10 bg-white/[0.03]"}`}
                >
                    <div className="flex items-start justify-between gap-3">
                        {renderUserIdentity(user)}
                        <AdminIconButton
                            label={t("admin.user_manager_ui.edit_user")}
                            onClick={() => handleEdit(user)}
                        >
                            <Edit2 size={16} />
                        </AdminIconButton>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {renderRoleBadge(user.role)}
                        {renderAccountTypeBadge(user)}
                        {renderPermissionBadge(user)}
                    </div>
                    <div className={`mt-3 grid grid-cols-2 gap-2 text-xs ${mutedTextClass}`}>
                        <span>{t("admin.user_manager_ui.created_at")}</span>
                        <span className="text-right">
                            {formatCreatedAt(user.created_at, currentLanguage)}
                        </span>
                        <span>{t("admin.user_manager_ui.org_count")}</span>
                        <span className="text-right tabular-nums">
                            {user.organization_profile_count || 0}
                        </span>
                        <span>{t("admin.user_manager_ui.pending_content")}</span>
                        <span className="text-right tabular-nums">
                            {user.pending_content_count || 0}
                        </span>
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

    const renderAccountsView = () => (
        <AdminPanel
            title={t("admin.user_manager_ui.list_title", { count: filteredUsers.length })}
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
                        matched: searchedUsers.length,
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
                    {renderMobileAccountCards()}
                    <AdminTableShell minWidth={1120}>
                        <thead>
                            <tr className="theme-admin-table-head border-b text-xs uppercase tracking-[0.16em]">
                                <th className="p-4">{t("admin.user_manager_ui.col_user")}</th>
                                <th className="p-4">{t("admin.user_manager_ui.col_role")}</th>
                                <th className="p-4">
                                    {t("admin.user_manager_ui.col_account_type")}
                                </th>
                                <th className="p-4">
                                    {t("admin.user_manager_ui.col_review_permission")}
                                </th>
                                <th className="p-4">{t("admin.user_manager_ui.col_orgs")}</th>
                                <th className="p-4">{t("admin.user_manager_ui.col_pending")}</th>
                                <th className="p-4">{t("admin.user_manager_ui.col_created")}</th>
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
                                    <td className="p-4">{renderAccountTypeBadge(user)}</td>
                                    <td className="p-4">{renderPermissionBadge(user)}</td>
                                    <td className="p-4 tabular-nums">
                                        {user.organization_profile_count || 0}
                                    </td>
                                    <td className="p-4 tabular-nums">
                                        {user.pending_content_count || 0}
                                    </td>
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
    );

    const renderOrganizationsView = () => (
        <AdminPanel
            title={t("admin.user_manager_ui.organizations_title", {
                count: filteredOrganizations.length,
            })}
            description={t("admin.user_manager_ui.organizations_desc")}
        >
            {organizationsLoading ? (
                <AdminLoadingState text={t("admin.user_manager_ui.loading_organizations")} />
            ) : filteredOrganizations.length === 0 ? (
                <AdminEmptyState
                    icon={Building2}
                    title={t("admin.user_manager_ui.empty_organizations_title")}
                    description={t("admin.user_manager_ui.empty_organizations_desc")}
                />
            ) : (
                <AdminTableShell minWidth={1040}>
                    <thead>
                        <tr className="theme-admin-table-head border-b text-xs uppercase tracking-[0.16em]">
                            <th className="p-4">{t("admin.user_manager_ui.col_organization")}</th>
                            <th className="p-4">{t("admin.user_manager_ui.col_scope")}</th>
                            <th className="p-4">{t("admin.user_manager_ui.col_members")}</th>
                            <th className="p-4">{t("admin.user_manager_ui.col_events")}</th>
                            <th className="p-4">{t("admin.user_manager_ui.col_content")}</th>
                            <th className="p-4">{t("admin.user_manager_ui.col_profile")}</th>
                        </tr>
                    </thead>
                    <tbody className="theme-admin-table-body divide-y">
                        {filteredOrganizations.map((organization) => {
                            const scope = organization.partner?.partner_scope || "profile_only";
                            const scopeTone =
                                scope === "core_partner"
                                    ? "emerald"
                                    : scope === "activity_provider"
                                      ? "sky"
                                      : "slate";
                            return (
                                <tr key={organization.id} className="theme-admin-row">
                                    <td className="p-4">
                                        <div className="min-w-0">
                                            <AdminTableCellText strong className="block truncate">
                                                {organization.display_name}
                                            </AdminTableCellText>
                                            <AdminTableCellText className="mt-1 block max-w-[320px] truncate text-xs">
                                                {organization.display_name_en ||
                                                    organization.handle}
                                            </AdminTableCellText>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {renderBadge(
                                            t(`admin.user_manager_ui.partner_scope.${scope}`),
                                            scopeTone,
                                            Building2
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="space-y-1">
                                            <AdminTableCellText>
                                                {organization.member_count || 0}
                                            </AdminTableCellText>
                                            {(organization.members || [])
                                                .slice(0, 2)
                                                .map((member) => (
                                                    <div
                                                        key={`${organization.id}-${member.user_id}`}
                                                        className={`text-xs ${mutedTextClass}`}
                                                    >
                                                        #{member.user_id}{" "}
                                                        {member.nickname || member.username} ·{" "}
                                                        {member.member_role}
                                                    </div>
                                                ))}
                                        </div>
                                    </td>
                                    <td className="p-4 tabular-nums">
                                        {organization.event_count || 0}
                                    </td>
                                    <td className="p-4 tabular-nums">
                                        {organization.content_summary?.total || 0}
                                    </td>
                                    <td className="p-4">
                                        <a
                                            href={
                                                organization.handle
                                                    ? `/org/${organization.handle}`
                                                    : undefined
                                            }
                                            target="_blank"
                                            rel="noreferrer"
                                            className={`text-sm font-semibold ${isDayMode ? "text-indigo-700" : "text-indigo-200"}`}
                                        >
                                            /org/{organization.handle}
                                        </a>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </AdminTableShell>
            )}
        </AdminPanel>
    );

    const renderPermissionsView = () => {
        const permissionRows = REVIEW_PERMISSIONS.map((permission) => {
            const matched = users.filter((user) => getReviewPermission(user) === permission);
            return { permission, users: matched };
        });
        return (
            <div className="grid gap-4 lg:grid-cols-3">
                {permissionRows.map(({ permission, users: permissionUsers }) => (
                    <AdminPanel
                        key={permission}
                        title={t(`admin.user_manager_ui.review_permission.${permission}`)}
                        description={t(
                            `admin.user_manager_ui.review_permission_desc.${permission}`
                        )}
                    >
                        <div className={`mb-3 text-3xl font-black ${headingTextClass}`}>
                            {permissionUsers.length}
                        </div>
                        <div className="space-y-2">
                            {permissionUsers.slice(0, 8).map((user) => (
                                <button
                                    key={user.id}
                                    type="button"
                                    onClick={() => handleEdit(user)}
                                    className={`flex w-full items-center justify-between gap-3 rounded-[8px] border px-3 py-2 text-left ${
                                        isDayMode
                                            ? "border-slate-200 bg-white hover:border-indigo-200"
                                            : "border-white/10 bg-white/5 hover:border-white/20"
                                    }`}
                                >
                                    <span
                                        className={`min-w-0 truncate text-sm font-semibold ${headingTextClass}`}
                                    >
                                        {getDisplayName(
                                            user,
                                            t("admin.user_manager_ui.unnamed_user")
                                        )}
                                    </span>
                                    <span className={`shrink-0 text-xs ${mutedTextClass}`}>
                                        #{user.id}
                                    </span>
                                </button>
                            ))}
                            {permissionUsers.length === 0 ? (
                                <p className={`text-sm ${mutedTextClass}`}>
                                    {t("admin.user_manager_ui.permission_empty")}
                                </p>
                            ) : null}
                        </div>
                    </AdminPanel>
                ))}
            </div>
        );
    };

    if (loading) {
        return <AdminLoadingState text={t("admin.user_manager_ui.loading_users")} />;
    }

    return (
        <>
            <AdminPageShell
                title={t("admin.user_manager_ui.title")}
                description={t("admin.user_manager_ui.description")}
                actions={
                    <AdminButton
                        tone="subtle"
                        onClick={refreshAll}
                        disabled={refreshing || organizationsLoading}
                    >
                        <RefreshCw
                            size={16}
                            className={refreshing || organizationsLoading ? "animate-spin" : ""}
                        />
                        {refreshing || organizationsLoading
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
                            {VIEW_KEYS.map((key) => (
                                <FilterChip
                                    key={key}
                                    active={activeView === key}
                                    onClick={() => setActiveView(key)}
                                >
                                    {t(`admin.user_manager_ui.views.${key}`)}
                                </FilterChip>
                            ))}
                        </ToolbarGroup>
                    </AdminToolbar>
                }
            >
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
                    <AdminMetricCard
                        label={t("admin.user_manager_ui.metric_total")}
                        value={totalCounts.total}
                        icon={Users}
                    />
                    <AdminMetricCard
                        label={t("admin.user_manager_ui.metric_admin")}
                        value={totalCounts.admin}
                        icon={ShieldCheck}
                        tone="violet"
                    />
                    <AdminMetricCard
                        label={t("admin.user_manager_ui.metric_trusted")}
                        value={totalCounts.trusted}
                        icon={ShieldCheck}
                        tone="emerald"
                    />
                    <AdminMetricCard
                        label={t("admin.user_manager_ui.metric_org_accounts")}
                        value={totalCounts.organizationAccounts}
                        icon={Building2}
                        tone="indigo"
                    />
                    <AdminMetricCard
                        label={t("admin.user_manager_ui.metric_organizations")}
                        value={organizationStats.total}
                        icon={Building2}
                        tone="amber"
                    />
                    <AdminMetricCard
                        label={t("admin.user_manager_ui.metric_pending")}
                        value={totalCounts.pendingContent}
                        icon={AlertTriangle}
                        tone="violet"
                    />
                </div>

                {activeView === "accounts" ? (
                    <AdminPanel>
                        <div className="flex flex-col gap-3">
                            <ToolbarGroup>
                                {roleTabs.map(({ key, label, icon: Icon, total }) => (
                                    <FilterChip
                                        key={key}
                                        active={roleFilter === key}
                                        onClick={() => setRoleFilter(key)}
                                    >
                                        <span className="inline-flex items-center gap-2">
                                            <Icon size={15} />
                                            {label}
                                        </span>
                                        <span className="ml-2 text-xs tabular-nums">{total}</span>
                                    </FilterChip>
                                ))}
                            </ToolbarGroup>
                            <ToolbarGroup>
                                {permissionTabs.map(({ key, label, total }) => (
                                    <FilterChip
                                        key={key}
                                        active={permissionFilter === key}
                                        onClick={() => setPermissionFilter(key)}
                                    >
                                        {label}
                                        <span className="ml-2 text-xs tabular-nums">{total}</span>
                                    </FilterChip>
                                ))}
                            </ToolbarGroup>
                        </div>
                    </AdminPanel>
                ) : null}

                {activeView === "accounts" ? renderAccountsView() : null}
                {activeView === "organizations" ? renderOrganizationsView() : null}
                {activeView === "permissions" ? renderPermissionsView() : null}
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
                        className={`rounded-[8px] border p-3 ${isDayMode ? "border-slate-200 bg-slate-50" : "border-white/10 bg-white/[0.03]"}`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            {editingUser ? renderUserIdentity(editingUser) : null}
                            <div className="flex flex-wrap justify-end gap-2">
                                {editingUser ? renderRoleBadge(editingUser.role) : null}
                                {editingUser ? renderPermissionBadge(editingUser) : null}
                            </div>
                        </div>
                        <p className={`mt-3 text-xs leading-5 ${mutedTextClass}`}>
                            {t("admin.user_manager_ui.edit_target_note", {
                                username: getDisplayName(
                                    editingUser,
                                    t("admin.user_manager_ui.unnamed_user")
                                ),
                            })}
                        </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <label
                            htmlFor={EDIT_ROLE_INPUT_ID}
                            className={`block text-sm font-medium ${subtleTextClass}`}
                        >
                            {t("admin.user_manager_ui.role_field")}
                            <select
                                id={EDIT_ROLE_INPUT_ID}
                                value={newRole}
                                onChange={(event) => {
                                    const role = event.target.value;
                                    setNewRole(role);
                                    if (role === "admin") {
                                        setNewReviewPermission("admin");
                                        setNewAdminScope("platform");
                                    }
                                }}
                                className="theme-admin-input mt-2 w-full rounded-[8px] p-3"
                            >
                                <option value="user">{t("admin.user_manager_ui.role_user")}</option>
                                <option value="admin">
                                    {t("admin.user_manager_ui.role_admin")}
                                </option>
                            </select>
                        </label>

                        <label
                            htmlFor={EDIT_ACCOUNT_TYPE_INPUT_ID}
                            className={`block text-sm font-medium ${subtleTextClass}`}
                        >
                            {t("admin.user_manager_ui.account_type_field")}
                            <select
                                id={EDIT_ACCOUNT_TYPE_INPUT_ID}
                                value={newAccountType}
                                onChange={(event) => setNewAccountType(event.target.value)}
                                className="theme-admin-input mt-2 w-full rounded-[8px] p-3"
                            >
                                {ACCOUNT_TYPES.map((type) => (
                                    <option key={type} value={type}>
                                        {t(`admin.user_manager_ui.account_type.${type}`)}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label
                            htmlFor={EDIT_REVIEW_PERMISSION_INPUT_ID}
                            className={`block text-sm font-medium ${subtleTextClass}`}
                        >
                            {t("admin.user_manager_ui.review_permission_field")}
                            <select
                                id={EDIT_REVIEW_PERMISSION_INPUT_ID}
                                value={newReviewPermission}
                                onChange={(event) => setNewReviewPermission(event.target.value)}
                                className="theme-admin-input mt-2 w-full rounded-[8px] p-3"
                            >
                                {REVIEW_PERMISSIONS.map((permission) => (
                                    <option key={permission} value={permission}>
                                        {t(`admin.user_manager_ui.review_permission.${permission}`)}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label
                            htmlFor={EDIT_ADMIN_SCOPE_INPUT_ID}
                            className={`block text-sm font-medium ${subtleTextClass}`}
                        >
                            {t("admin.user_manager_ui.admin_scope_field")}
                            <select
                                id={EDIT_ADMIN_SCOPE_INPUT_ID}
                                value={newAdminScope}
                                onChange={(event) => setNewAdminScope(event.target.value)}
                                className="theme-admin-input mt-2 w-full rounded-[8px] p-3"
                            >
                                {ADMIN_SCOPES.map((scope) => (
                                    <option key={scope} value={scope}>
                                        {t(`admin.user_manager_ui.admin_scope.${scope}`)}
                                    </option>
                                ))}
                            </select>
                        </label>
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
                            className={`mt-2 flex items-center gap-1.5 text-xs ${passwordTooShort ? (isDayMode ? "text-rose-700" : "text-rose-300") : mutedTextClass}`}
                        >
                            {passwordTooShort ? <AlertTriangle size={13} /> : <Key size={13} />}
                            {passwordTooShort
                                ? t("admin.user_manager_ui.password_too_short")
                                : t("admin.user_manager_ui.password_hint")}
                        </p>
                    </div>

                    <AdminInlineNote tone="warning">
                        <span className="font-semibold">
                            {t("admin.user_manager_ui.permission_scope_title")}
                        </span>
                        <span className="mt-1 block">
                            {t("admin.user_manager_ui.permission_scope_desc")}
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
                        t("admin.user_manager_ui.unnamed_user")
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
