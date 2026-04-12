import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Eye,
  Users,
  CalendarDays,
  BarChart3,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../services/api";
import Dropdown from "../Dropdown";
import UploadModal from "../UploadModal";

const ResourceManager = ({ title, apiEndpoint, type, icon: Icon }) => {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const isEventResource = apiEndpoint === "events";
  const [sort, setSort] = useState(isEventResource ? "views" : "newest");

  const fetchItems = async (page = 1) => {
    setLoading(true);
    try {
      // Add timestamp to prevent browser caching
      const timestamp = new Date().getTime();
      const response = await api.get(
        `/${apiEndpoint}?page=${page}&limit=10&search=${search}&status=all&sort=${sort}&_t=${timestamp}`,
      );
      setItems(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Fetch error:", error);
      }
      toast.error(t("admin.toast.fetch_error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [apiEndpoint, type, sort]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchItems(1);
  };

  const [deleteConfirmation, setDeleteConfirmation] = useState(null);

  const eventSortOptions = useMemo(
    () => [
      {
        value: "views",
        label: t("admin.resource_manager_ui.sort_views", "按访问量"),
      },
      {
        value: "registrations",
        label: t("admin.resource_manager_ui.sort_registrations", "按报名量"),
      },
      { value: "date_desc", label: t("sort_filter.date_desc", "日期（最晚）") },
      { value: "date_asc", label: t("sort_filter.date_asc", "日期（最早）") },
      { value: "newest", label: t("sort_filter.newest", "最新") },
    ],
    [t],
  );

  const eventStats = useMemo(() => {
    if (!isEventResource) return null;

    return items.reduce(
      (accumulator, item) => ({
        totalViews: accumulator.totalViews + Number(item.views || 0),
        totalRegistrations:
          accumulator.totalRegistrations + Number(item.registration_count || 0),
        upcoming:
          accumulator.upcoming +
          (item.date &&
          new Date(item.date) >= new Date(new Date().toDateString())
            ? 1
            : 0),
      }),
      {
        totalViews: 0,
        totalRegistrations: 0,
        upcoming: 0,
      },
    );
  }, [isEventResource, items]);

  const formatNumber = (value) =>
    new Intl.NumberFormat("zh-CN").format(Number(value || 0));
  const formatDate = (value) =>
    value ? String(value).replace("T", " ").slice(0, 16) : "—";
  const getStatusClassName = (status) => {
    if (status === "approved")
      return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
    if (status === "pending")
      return "bg-amber-500/10 text-amber-300 border-amber-500/20";
    if (status === "rejected")
      return "bg-red-500/10 text-red-300 border-red-500/20";
    return "bg-white/5 text-gray-300 border-white/10";
  };
  const tableColumnCount =
    4 +
    (type === "image" ? 1 : 0) +
    (type === "audio" ? 1 : 0) +
    (isEventResource ? 4 : 0);

  const handleDelete = (id) => {
    setDeleteConfirmation(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;
    try {
      // Use permanent delete endpoint for full cleanup
      await api.delete(`/${apiEndpoint}/${deleteConfirmation}/permanent`);
      toast.success(t("admin.toast.delete_success"));
      fetchItems(pagination.page);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Delete failed:", error);
      }
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        t("admin.toast.delete_fail");
      toast.error(errorMessage);
    } finally {
      setDeleteConfirmation(null);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleSave = async (newItem) => {
    try {
      if (editingItem) {
        await api.put(`/${apiEndpoint}/${editingItem.id}`, newItem);
        toast.success(t("admin.toast.update_success"));
      } else {
        await api.post(`/${apiEndpoint}`, newItem);
        toast.success(t("admin.toast.create_success"));
      }
      setIsModalOpen(false);
      fetchItems(pagination.page);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Save failed:", error);
      }
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        t("admin.toast.save_fail");
      toast.error(errorMessage);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-4 bg-[#111] p-3 md:p-4 rounded-2xl border border-white/10">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center text-indigo-400">
              <Icon size={20} />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-white">
                {title}
              </h2>
              {isEventResource ? (
                <p className="text-sm text-gray-400 mt-1">
                  {t(
                    "admin.resource_manager_ui.event_manager_desc",
                    "后台统一查看活动热度、报名和审核状态。",
                  )}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <form onSubmit={handleSearch} className="relative flex-1 sm:w-64">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                size={16}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("admin.search_placeholder")}
                className="w-full bg-black border border-white/10 rounded-xl pl-10 pr-4 py-2.5 min-h-[44px] text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </form>
            <button
              onClick={handleAdd}
              className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 md:px-4 py-2.5 min-h-[44px] rounded-xl font-bold text-sm transition-colors shadow-lg shadow-indigo-500/20"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">{t("admin.add_new")}</span>
            </button>
          </div>
        </div>

        {isEventResource ? (
          <div className="flex flex-col xl:flex-row gap-4 xl:items-end xl:justify-between">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 md:p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs uppercase tracking-[0.22em] text-gray-400">
                    {t("admin.resource_manager_ui.views", "访问量")}
                  </span>
                  <Eye size={16} className="text-indigo-400" />
                </div>
                <div className="mt-3 text-xl md:text-2xl font-bold text-white">
                  {formatNumber(eventStats?.totalViews)}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 md:p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs uppercase tracking-[0.22em] text-gray-400">
                    {t("admin.resource_manager_ui.registrations", "报名量")}
                  </span>
                  <Users size={16} className="text-emerald-400" />
                </div>
                <div className="mt-3 text-xl md:text-2xl font-bold text-white">
                  {formatNumber(eventStats?.totalRegistrations)}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 md:p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs uppercase tracking-[0.22em] text-gray-400">
                    {t("admin.resource_manager_ui.upcoming_events", "待开始")}
                  </span>
                  <CalendarDays size={16} className="text-amber-400" />
                </div>
                <div className="mt-3 text-xl md:text-2xl font-bold text-white">
                  {formatNumber(eventStats?.upcoming)}
                </div>
              </div>
            </div>

            <div className="w-full xl:w-72">
              <Dropdown
                value={sort}
                onChange={setSort}
                options={eventSortOptions}
                placeholder={t("admin.resource_manager_ui.sort_by", "排序方式")}
                icon={BarChart3}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="bg-[#111] rounded-2xl border border-white/10 overflow-hidden">
        {isEventResource ? (
          <div className="md:hidden divide-y divide-white/5">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                {t("admin.resource_manager_ui.loading")}
              </div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {t("admin.no_items")}
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="p-4 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-xs text-gray-500 font-mono mb-1">
                        #{item.id}
                      </div>
                      <h3 className="text-base font-bold text-white leading-snug">
                        {item.title}
                      </h3>
                    </div>
                    <span
                      className={`shrink-0 px-2.5 py-1 rounded-full border text-xs font-semibold ${getStatusClassName(item.status)}`}
                    >
                      {item.status || "—"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white/5 border border-white/5 p-3">
                      <div className="text-xs text-gray-400 mb-1">
                        {t("admin.resource_manager_ui.event_date", "活动时间")}
                      </div>
                      <div className="text-sm text-white">
                        {formatDate(item.date)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-white/5 border border-white/5 p-3">
                      <div className="text-xs text-gray-400 mb-1">
                        {t("admin.resource_manager_ui.views", "访问量")}
                      </div>
                      <div className="text-sm text-white">
                        {formatNumber(item.views)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-white/5 border border-white/5 p-3">
                      <div className="text-xs text-gray-400 mb-1">
                        {t("admin.resource_manager_ui.registrations", "报名量")}
                      </div>
                      <div className="text-sm text-white">
                        {formatNumber(item.registration_count)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-white/5 border border-white/5 p-3">
                      <div className="text-xs text-gray-400 mb-1">
                        {t("admin.fields.tags")}
                      </div>
                      <div className="text-sm text-white line-clamp-2">
                        {item.tags || "—"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 min-h-[40px] min-w-[40px] inline-flex items-center justify-center bg-white/5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-indigo-400 transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 min-h-[40px] min-w-[40px] inline-flex items-center justify-center bg-white/5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table
            className={`w-full text-left border-collapse ${isEventResource ? "hidden md:table" : ""}`}
          >
            <thead>
              <tr className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
                <th className="p-3 md:p-4">{t("admin.id")}</th>
                <th className="p-3 md:p-4">{t("admin.fields.title")}</th>
                {isEventResource ? (
                  <th className="p-3 md:p-4">
                    {t("admin.resource_manager_ui.event_date", "活动时间")}
                  </th>
                ) : null}
                {isEventResource ? (
                  <th className="p-3 md:p-4">
                    {t("admin.resource_manager_ui.review_status", "审核状态")}
                  </th>
                ) : null}
                {isEventResource ? (
                  <th className="p-3 md:p-4">
                    {t("admin.resource_manager_ui.views", "访问量")}
                  </th>
                ) : null}
                {isEventResource ? (
                  <th className="p-3 md:p-4">
                    {t("admin.resource_manager_ui.registrations", "报名量")}
                  </th>
                ) : null}
                {type === "image" ? (
                  <th className="p-3 md:p-4">{t("admin.fields.preview")}</th>
                ) : null}
                {type === "audio" ? (
                  <th className="p-3 md:p-4">{t("admin.fields.artist")}</th>
                ) : null}
                <th className="p-3 md:p-4">{t("admin.fields.tags")}</th>
                <th className="p-3 md:p-4 text-right">{t("admin.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td
                    colSpan={tableColumnCount}
                    className="p-8 text-center text-gray-500"
                  >
                    {t("admin.resource_manager_ui.loading")}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={tableColumnCount}
                    className="p-8 text-center text-gray-500"
                  >
                    {t("admin.no_items")}
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="p-4 text-gray-500 font-mono text-xs">
                      #{item.id}
                    </td>
                    <td className="p-4 font-bold text-white">{item.title}</td>
                    {isEventResource ? (
                      <td className="p-4 text-gray-300">
                        {formatDate(item.date)}
                      </td>
                    ) : null}
                    {isEventResource ? (
                      <td className="p-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full border text-xs font-semibold ${getStatusClassName(item.status)}`}
                        >
                          {item.status || "—"}
                        </span>
                      </td>
                    ) : null}
                    {isEventResource ? (
                      <td className="p-4 text-indigo-300 font-semibold">
                        {formatNumber(item.views)}
                      </td>
                    ) : null}
                    {isEventResource ? (
                      <td className="p-4 text-emerald-300 font-semibold">
                        {formatNumber(item.registration_count)}
                      </td>
                    ) : null}
                    {type === "image" ? (
                      <td className="p-4">
                        <img
                          src={item.url}
                          alt={item.title}
                          className="w-12 h-12 object-cover rounded-lg border border-white/10"
                        />
                      </td>
                    ) : null}
                    {type === "audio" ? (
                      <td className="p-4 text-gray-400">{item.artist}</td>
                    ) : null}
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {item.tags &&
                          item.tags
                            .split(",")
                            .filter(Boolean)
                            .map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-white/5 rounded text-xs text-gray-400 border border-white/5"
                              >
                                {tag.trim()}
                              </span>
                            ))}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 min-h-[40px] min-w-[40px] inline-flex items-center justify-center bg-white/5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-indigo-400 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 min-h-[40px] min-w-[40px] inline-flex items-center justify-center bg-white/5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-white/10 flex items-center justify-center gap-3 md:gap-4">
            <button
              disabled={pagination.page === 1}
              onClick={() => fetchItems(pagination.page - 1)}
              className="p-2 min-h-[40px] min-w-[40px] inline-flex items-center justify-center bg-white/5 rounded-lg disabled:opacity-50 hover:bg-white/10 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-gray-400">
              {t("admin.resource_manager_ui.pagination_info", {
                page: pagination.page,
                total: pagination.totalPages,
              })}
            </span>
            <button
              disabled={pagination.page === pagination.totalPages}
              onClick={() => fetchItems(pagination.page + 1)}
              className="p-2 min-h-[40px] min-w-[40px] inline-flex items-center justify-center bg-white/5 rounded-lg disabled:opacity-50 hover:bg-white/10 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmation && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#111] border border-white/10 rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden p-6 pb-[calc(env(safe-area-inset-bottom)+24px)] md:pb-6"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mb-4">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {t("admin.delete_confirm")}
                </h3>
                <p className="text-gray-400 mb-6 text-sm">
                  {t("admin.delete_warning_desc")}
                </p>

                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setDeleteConfirmation(null)}
                    className="flex-1 py-3 rounded-xl font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    {t("admin.cancel")}
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-500/25"
                  >
                    {t("admin.delete")}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Upload/Edit Modal */}
      <UploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpload={handleSave}
        type={type}
        initialData={editingItem}
      />
    </div>
  );
};

export default ResourceManager;
