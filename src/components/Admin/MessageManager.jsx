import React, { useEffect, useMemo, useState } from "react";
import { Mail, Trash2, Check, Clock, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";
import {
  AdminButton,
  AdminEmptyState,
  AdminIconButton,
  AdminLoadingState,
  AdminMetricCard,
  AdminPageShell,
  AdminPanel,
  AdminToolbar,
  ConfirmDialog,
  FilterChip,
  ToolbarGroup,
  useAdminTheme,
} from "./AdminUI";

const MessageManager = () => {
  const {
    isDayMode,
    headingTextClass,
    mutedTextClass,
    subtleTextClass,
  } = useAdminTheme();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [pending, setPending] = useState(false);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const response = await api.get("/admin/messages");
      const nextMessages = Array.isArray(response.data)
        ? response.data
        : response.data?.data || [];
      setMessages(nextMessages);
    } catch {
      toast.error("加载留言失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const filteredMessages = useMemo(() => {
    if (filter === "read") return messages.filter((message) => Number(message.read) === 1);
    if (filter === "unread") return messages.filter((message) => Number(message.read) !== 1);
    return messages;
  }, [filter, messages]);

  const counts = useMemo(
    () => ({
      total: messages.length,
      unread: messages.filter((message) => Number(message.read) !== 1).length,
      read: messages.filter((message) => Number(message.read) === 1).length,
    }),
    [messages],
  );

  const metricCards = [
    {
      label: "总留言",
      value: counts.total,
      icon: Mail,
      tone: "indigo",
      helper: "全部联系表单",
    },
    {
      label: "未读",
      value: counts.unread,
      icon: Mail,
      tone: "amber",
      helper: "需要优先处理",
    },
    {
      label: "已读",
      value: counts.read,
      icon: Check,
      tone: "emerald",
      helper: "已经确认过",
    },
  ];

  const renderMessageCard = (message) => {
    const isUnread = Number(message.read) !== 1;

    return (
      <div
        key={message.id}
        className={`rounded-2xl border p-4 md:p-5 ${
          isUnread
            ? isDayMode
              ? "border-indigo-200/80 bg-indigo-50/75"
              : "border-indigo-500/20 bg-indigo-500/10"
            : isDayMode
              ? "border-slate-200/70 bg-white/[0.78]"
              : "border-white/10 bg-white/[0.03]"
        }`}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={`text-lg font-semibold ${headingTextClass}`}>
                {message.name || "匿名用户"}
              </h3>
              {message.email ? (
                <span
                  className={`break-all rounded-full px-2.5 py-1 text-xs ${
                    isDayMode
                      ? "bg-white/80 text-slate-500"
                      : "bg-white/5 text-gray-400"
                  }`}
                >
                  {message.email}
                </span>
              ) : null}
              {isUnread ? (
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    isDayMode
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-indigo-600 text-white"
                  }`}
                >
                  未读
                </span>
              ) : null}
            </div>
            <p
              className={`mt-3 whitespace-pre-wrap break-words text-sm leading-6 ${subtleTextClass}`}
            >
              {message.message || "暂无留言内容"}
            </p>
            <div className={`mt-4 flex items-center gap-2 text-xs ${mutedTextClass}`}>
              <Clock size={12} />
              {message.date
                ? new Date(message.date).toLocaleString("zh-CN")
                : "未知时间"}
            </div>
          </div>

          <div className="flex gap-2">
            {isUnread ? (
              <AdminIconButton
                label="标记为已读"
                tone="success"
                disabled={pending}
                onClick={() => handleMarkAsRead(message.id)}
              >
                <Check size={18} />
              </AdminIconButton>
            ) : null}
            <AdminIconButton
              label="删除留言"
              tone="danger"
              disabled={pending}
              onClick={() => setConfirmDeleteId(message.id)}
            >
              <Trash2 size={18} />
            </AdminIconButton>
          </div>
        </div>
      </div>
    );
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/admin/messages/${id}/read`);
      setMessages((previous) =>
        previous.map((message) =>
          message.id === id ? { ...message, read: 1 } : message,
        ),
      );
      toast.success("已标记为已读");
    } catch {
      toast.error("标记失败");
    }
  };

  const markVisibleAsRead = async () => {
    const unreadIds = filteredMessages
      .filter((message) => Number(message.read) !== 1)
      .map((message) => message.id);
    if (unreadIds.length === 0) return;
    setPending(true);
    try {
      await Promise.all(unreadIds.map((id) => api.put(`/admin/messages/${id}/read`)));
      setMessages((previous) =>
        previous.map((message) =>
          unreadIds.includes(message.id) ? { ...message, read: 1 } : message,
        ),
      );
      toast.success(`已标记 ${unreadIds.length} 条留言为已读`);
    } catch {
      toast.error("批量标记失败");
    } finally {
      setPending(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    setPending(true);
    try {
      await api.delete(`/admin/messages/${confirmDeleteId}`);
      setMessages((previous) =>
        previous.filter((message) => message.id !== confirmDeleteId),
      );
      toast.success("留言已删除");
      setConfirmDeleteId(null);
    } catch {
      toast.error("删除留言失败");
    } finally {
      setPending(false);
    }
  };

  if (loading) {
    return <AdminLoadingState text="正在加载留言..." />;
  }

  return (
    <>
      <AdminPageShell
        title="留言中心"
        description="这里集中处理站点联系表单提交的留言。建议优先处理未读消息。"
        actions={
          <>
            <AdminButton tone="subtle" onClick={fetchMessages}>
              <RefreshCw size={16} />
              刷新
            </AdminButton>
            <AdminButton
              tone="primary"
              disabled={counts.unread === 0 || pending}
              onClick={markVisibleAsRead}
            >
              <Check size={16} />
              标记当前结果为已读
            </AdminButton>
          </>
        }
        toolbar={
          <AdminToolbar>
            <ToolbarGroup>
              <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
                全部 ({counts.total})
              </FilterChip>
              <FilterChip active={filter === "unread"} onClick={() => setFilter("unread")}>
                未读 ({counts.unread})
              </FilterChip>
              <FilterChip active={filter === "read"} onClick={() => setFilter("read")}>
                已读 ({counts.read})
              </FilterChip>
            </ToolbarGroup>
          </AdminToolbar>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {metricCards.map((card) => (
            <AdminMetricCard key={card.label} {...card} />
          ))}
        </div>

        <AdminPanel title={`留言列表 (${filteredMessages.length})`}>
          {filteredMessages.length === 0 ? (
            <AdminEmptyState
              icon={Mail}
              title="当前没有匹配的留言"
              description="可以切换筛选条件，或稍后刷新重试。"
            />
          ) : (
            <div className="grid gap-4">
              {filteredMessages.map(renderMessageCard)}
            </div>
          )}
        </AdminPanel>
      </AdminPageShell>

      <ConfirmDialog
        open={Boolean(confirmDeleteId)}
        title="确认删除留言"
        description="删除后不可恢复。"
        confirmText="确认删除"
        tone="danger"
        pending={pending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </>
  );
};

export default MessageManager;
