import React, { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, Plus, RotateCcw, Trash2, Upload } from "lucide-react";
import { updateProfileCard, uploadProfileCardCover } from "../../services/api";
import toast from "react-hot-toast";

const STATUS_OPTIONS = [
  { value: "", label: "不显示状态" },
  { value: "open_chat", label: "开放交流" },
  { value: "seeking_collab", label: "寻求合作" },
  { value: "coffee_chat", label: "Coffee Chat" },
  { value: "team_up", label: "组队开发" },
  { value: "joining_events", label: "活动参与" },
  { value: "busy", label: "暂时忙碌" },
];

const PLATFORM_OPTIONS = [
  ["wechat", "微信"],
  ["github", "GitHub"],
  ["twitter", "X/Twitter"],
  ["xiaohongshu", "小红书"],
  ["bilibili", "B站"],
  ["email", "邮箱"],
  ["website", "个人网站"],
  ["zhihu", "知乎"],
  ["linkedin", "LinkedIn"],
  ["custom", "自定义"],
];

const CARD_TYPE_OPTIONS = [
  ["project", "项目"],
  ["work", "作品"],
  ["article", "文章"],
  ["event", "活动"],
  ["experience", "经历"],
  ["resource", "资源"],
  ["social", "社交入口"],
  ["other", "其他"],
];

const ASPECT_RATIO_OPTIONS = [
  ["square", "1:1", "1 / 1"],
  ["landscape", "4:3", "4 / 3"],
  ["portrait", "3:4", "3 / 4"],
  ["wide", "16:9", "16 / 9"],
  ["vertical", "9:16", "9 / 16"],
  ["large", "大横幅", "16 / 10"],
];

const ASPECT_RATIO_VALUES = {
  square: 1,
  landscape: 4 / 3,
  portrait: 3 / 4,
  wide: 16 / 9,
  vertical: 9 / 16,
  large: 16 / 10,
};

const SAVE_TEXT = {
  saved: "已保存",
  dirty: "未保存",
  saving: "保存中...",
  error: "保存失败",
};

const emptyLink = () => ({
  platform: "website",
  label: "",
  url: "",
  is_visible: true,
});

const emptyCard = () => ({
  card_type: "project",
  custom_type: "",
  cover_url: "",
  description: "",
  link_url: "",
  crop_x: 0,
  crop_y: 0,
  crop_width: 1,
  crop_height: 1,
  aspect_ratio: "wide",
  is_visible: true,
});

const splitList = (value) =>
  String(value || "")
    .split(/[\n,，]/)
    .map((item) => item.trim())
    .filter(Boolean);

const joinList = (items = []) => items.join("\n");

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeCrop = (card = {}) => {
  const cropWidth = clamp(Number(card.crop_width ?? card.cropWidth ?? 1) || 1, 0.05, 1);
  const cropHeight = clamp(Number(card.crop_height ?? card.cropHeight ?? 1) || 1, 0.05, 1);
  return {
    crop_x: clamp(Number(card.crop_x ?? card.cropX ?? 0) || 0, 0, 1 - cropWidth),
    crop_y: clamp(Number(card.crop_y ?? card.cropY ?? 0) || 0, 0, 1 - cropHeight),
    crop_width: cropWidth,
    crop_height: cropHeight,
  };
};

const normalizeDraft = (profileCard = {}) => ({
  slogan: profileCard.slogan || "",
  status: profileCard.status || "",
  tagsText: joinList((profileCard.tags || []).map((tag) => tag.label || tag).filter(Boolean)),
  social_links: (profileCard.social_links || []).map((link) => ({
    platform: link.platform || "custom",
    label: link.label || "",
    url: link.url || "",
    is_visible: link.is_visible !== false,
  })),
  cards: (profileCard.cards || []).map((card) => ({
    ...emptyCard(),
    card_type: card.card_type || "other",
    custom_type: card.custom_type || "",
    cover_url: card.cover_url || card.images?.[0] || "",
    description: card.description || card.note || card.body || "",
    link_url: card.link_url || card.links?.[0]?.url || "",
    aspect_ratio: card.aspect_ratio || "wide",
    is_visible: card.is_visible !== false,
    ...normalizeCrop(card),
  })),
});

const moveItem = (items, index, direction) => {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(nextIndex, 0, item);
  return next;
};

const getAspectRatio = (value) =>
  ASPECT_RATIO_OPTIONS.find(([key]) => key === value)?.[2] || "16 / 9";

const normalizeCropBox = (crop) => {
  const width = clamp(crop.crop_width, 0.12, 1);
  const height = clamp(crop.crop_height, 0.12, 1);
  return {
    crop_width: width,
    crop_height: height,
    crop_x: clamp(crop.crop_x, 0, 1 - width),
    crop_y: clamp(crop.crop_y, 0, 1 - height),
  };
};

const getCroppedImageStyle = (card) => {
  const crop = normalizeCropBox({
    crop_x: Number(card.crop_x) || 0,
    crop_y: Number(card.crop_y) || 0,
    crop_width: Number(card.crop_width) || 1,
    crop_height: Number(card.crop_height) || 1,
  });
  return {
    width: `${100 / crop.crop_width}%`,
    height: `${100 / crop.crop_height}%`,
    left: `-${(crop.crop_x * 100) / crop.crop_width}%`,
    top: `-${(crop.crop_y * 100) / crop.crop_height}%`,
    objectFit: "cover",
  };
};

const getTypeLabel = (card) =>
  card.custom_type || CARD_TYPE_OPTIONS.find(([value]) => value === card.card_type)?.[1] || "自定义";

const FieldLabel = ({ children, isDayMode }) => (
  <label className={`block text-xs font-bold ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
    {children}
  </label>
);

const SaveState = ({ state, isDayMode }) => (
  <span className={`text-xs font-bold ${state === "dirty" ? "text-amber-500" : state === "error" ? "text-rose-500" : isDayMode ? "text-slate-500" : "text-gray-500"}`}>
    {SAVE_TEXT[state] || SAVE_TEXT.saved}
  </span>
);

const ProfileCardEditor = ({ profileCard, isDayMode, onSaved }) => {
  const [draft, setDraft] = useState(() => normalizeDraft(profileCard));
  const [saveStates, setSaveStates] = useState({
    basics: "saved",
    tags: "saved",
    socials: "saved",
    cardsOrder: "saved",
    cards: {},
  });
  const [coverUploadingIndex, setCoverUploadingIndex] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const cropDragRef = useRef(null);

  useEffect(() => {
    setDraft(normalizeDraft(profileCard));
    setSaveStates({ basics: "saved", tags: "saved", socials: "saved", cardsOrder: "saved", cards: {} });
  }, [profileCard]);

  const inputClass = `w-full rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 ${
    isDayMode
      ? "border border-slate-200 bg-white text-slate-900"
      : "border border-white/10 bg-black/30 text-white"
  }`;

  const buttonClass = "inline-flex min-h-[36px] items-center justify-center rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50";

  const markState = (key, state) => setSaveStates((prev) => ({ ...prev, [key]: state }));
  const markCardState = (index, state) =>
    setSaveStates((prev) => ({ ...prev, cards: { ...prev.cards, [index]: state } }));

  const updateLink = (index, patch) => {
    setDraft((prev) => ({
      ...prev,
      social_links: prev.social_links.map((link, i) => (i === index ? { ...link, ...patch } : link)),
    }));
    markState("socials", "dirty");
  };

  const updateCard = (index, patch) => {
    setDraft((prev) => ({
      ...prev,
      cards: prev.cards.map((card, i) => (i === index ? { ...card, ...patch } : card)),
    }));
    markCardState(index, "dirty");
  };

  const buildPayload = (nextDraft = draft) => ({
    slogan: nextDraft.slogan,
    status: nextDraft.status,
    tags: splitList(nextDraft.tagsText).slice(0, 24).map((label, index) => ({ label, sort_order: index })),
    social_links: nextDraft.social_links.map((link, index) => ({ ...link, sort_order: index })),
    cards: nextDraft.cards.map((card, index) => ({
      card_type: card.card_type,
      custom_type: card.custom_type,
      cover_url: card.cover_url,
      description: card.description,
      link_url: card.link_url,
      crop_x: card.crop_x,
      crop_y: card.crop_y,
      crop_width: card.crop_width,
      crop_height: card.crop_height,
      aspect_ratio: card.aspect_ratio,
      title: getTypeLabel(card),
      body: card.description,
      note: card.description,
      images: card.cover_url ? [card.cover_url] : [],
      links: card.link_url ? [{ label: getTypeLabel(card), url: card.link_url }] : [],
      is_visible: card.is_visible,
      sort_order: index,
    })),
  });

  const saveSection = async (section, cardIndex = null, nextDraft = draft) => {
    if (cardIndex === null) {
      markState(section, "saving");
    } else {
      markCardState(cardIndex, "saving");
    }
    try {
      const res = await updateProfileCard(buildPayload(nextDraft));
      setDraft(normalizeDraft(res.data));
      onSaved?.(res.data);
      if (cardIndex === null) {
        markState(section, "saved");
        if (section === "cardsOrder") markState("cardsOrder", "saved");
      } else {
        markCardState(cardIndex, "saved");
      }
      toast.success(cardIndex === null ? "已保存" : "卡片已保存");
    } catch (error) {
      if (cardIndex === null) markState(section, "error");
      else markCardState(cardIndex, "error");
      toast.error(error.response?.data?.error || "保存失败");
    }
  };

  const handleCoverUpload = async (index, file) => {
    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      toast.error("封面必须是图片文件");
      return;
    }
    setCoverUploadingIndex(index);
    try {
      const res = await uploadProfileCardCover(file);
      const coverUrl = res.data?.fileUrl || res.data?.coverUrl;
      if (!coverUrl) throw new Error("缺少封面地址");
      updateCard(index, { cover_url: coverUrl, crop_x: 0.1, crop_y: 0.1, crop_width: 0.8, crop_height: 0.8 });
      toast.success("封面已上传，请保存此卡片");
    } catch (error) {
      toast.error(error.response?.data?.message || error.response?.data?.error || "封面上传失败");
    } finally {
      setCoverUploadingIndex(null);
    }
  };

  const reorderCards = (fromIndex, toIndex) => {
    if (fromIndex === null || fromIndex === toIndex) return;
    setDraft((prev) => {
      const nextCards = [...prev.cards];
      const [item] = nextCards.splice(fromIndex, 1);
      nextCards.splice(toIndex, 0, item);
      return { ...prev, cards: nextCards };
    });
    markState("cardsOrder", "dirty");
  };

  const startCropDrag = (event, index, mode) => {
    event.preventDefault();
    event.stopPropagation();
    const box = event.currentTarget.closest("[data-crop-box]")?.getBoundingClientRect();
    if (!box) return;
    const card = draft.cards[index];
    cropDragRef.current = {
      index,
      mode,
      box,
      startX: event.clientX,
      startY: event.clientY,
      crop: { x: card.crop_x, y: card.crop_y, w: card.crop_width, h: card.crop_height },
    };
    window.addEventListener("pointermove", handleCropMove);
    window.addEventListener("pointerup", endCropDrag, { once: true });
  };

  const handleCropMove = (event) => {
    const drag = cropDragRef.current;
    if (!drag) return;
    const dx = (event.clientX - drag.startX) / drag.box.width;
    const dy = (event.clientY - drag.startY) / drag.box.height;
    if (drag.mode === "move") {
      updateCard(drag.index, {
        crop_x: clamp(drag.crop.x + dx, 0, 1 - drag.crop.w),
        crop_y: clamp(drag.crop.y + dy, 0, 1 - drag.crop.h),
      });
      return;
    }

    const minSize = 0.12;
    let next = { crop_x: drag.crop.x, crop_y: drag.crop.y, crop_width: drag.crop.w, crop_height: drag.crop.h };
    if (drag.mode.includes("e")) {
      next.crop_width = clamp(drag.crop.w + dx, minSize, 1 - drag.crop.x);
    }
    if (drag.mode.includes("s")) {
      next.crop_height = clamp(drag.crop.h + dy, minSize, 1 - drag.crop.y);
    }
    if (drag.mode.includes("w")) {
      const newX = clamp(drag.crop.x + dx, 0, drag.crop.x + drag.crop.w - minSize);
      next.crop_width = drag.crop.w + drag.crop.x - newX;
      next.crop_x = newX;
    }
    if (drag.mode.includes("n")) {
      const newY = clamp(drag.crop.y + dy, 0, drag.crop.y + drag.crop.h - minSize);
      next.crop_height = drag.crop.h + drag.crop.y - newY;
      next.crop_y = newY;
    }
    updateCard(drag.index, normalizeCropBox(next));
  };

  const endCropDrag = () => {
    window.removeEventListener("pointermove", handleCropMove);
    cropDragRef.current = null;
  };

  return (
    <div className="space-y-5">
      <div className={`rounded-2xl border p-4 ${isDayMode ? "border-slate-200 bg-slate-50/80" : "border-white/10 bg-black/20"}`}>
        <div className="mb-3 flex items-center justify-between">
          <div className={`text-sm font-bold ${isDayMode ? "text-slate-800" : "text-white"}`}>一句话简介</div>
          <SaveState state={saveStates.basics} isDayMode={isDayMode} />
        </div>
        <div className="space-y-3">
          <textarea
            value={draft.slogan}
            onChange={(event) => {
              setDraft((prev) => ({ ...prev, slogan: event.target.value }));
              markState("basics", "dirty");
            }}
            rows={3}
            maxLength={240}
            className={`${inputClass} resize-none`}
            placeholder="例如：用技术和设计连接校园里的好想法"
          />
          <select
            value={draft.status}
            onChange={(event) => {
              setDraft((prev) => ({ ...prev, status: event.target.value }));
              markState("basics", "dirty");
            }}
            className={inputClass}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <button type="button" onClick={() => saveSection("basics")} className={buttonClass} disabled={saveStates.basics === "saving"}>
            保存简介
          </button>
        </div>
      </div>

      <div className={`rounded-2xl border p-4 ${isDayMode ? "border-slate-200 bg-slate-50/80" : "border-white/10 bg-black/20"}`}>
        <div className="mb-3 flex items-center justify-between">
          <div className={`text-sm font-bold ${isDayMode ? "text-slate-800" : "text-white"}`}>个人标签</div>
          <SaveState state={saveStates.tags} isDayMode={isDayMode} />
        </div>
        <textarea
          value={draft.tagsText}
          onChange={(event) => {
            setDraft((prev) => ({ ...prev, tagsText: event.target.value }));
            markState("tags", "dirty");
          }}
          rows={3}
          className={`${inputClass} min-h-[92px] resize-y whitespace-pre-wrap break-words`}
          placeholder="每行一个标签，例如：开发者"
        />
        <p className={`mt-1 text-xs ${isDayMode ? "text-slate-500" : "text-gray-500"}`}>请一行填写一个标签。</p>
        <button type="button" onClick={() => saveSection("tags")} className={`${buttonClass} mt-3`} disabled={saveStates.tags === "saving"}>
          保存标签
        </button>
      </div>

      <div className={`rounded-2xl border p-4 ${isDayMode ? "border-slate-200 bg-slate-50/80" : "border-white/10 bg-black/20"}`}>
        <div className="mb-3 flex items-center justify-between">
          <div className={`text-sm font-bold ${isDayMode ? "text-slate-800" : "text-white"}`}>社交链接</div>
          <div className="flex items-center gap-3">
            <SaveState state={saveStates.socials} isDayMode={isDayMode} />
            <button type="button" onClick={() => { setDraft((prev) => ({ ...prev, social_links: [...prev.social_links, emptyLink()] })); markState("socials", "dirty"); }} className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white">
              <Plus size={14} /> 添加
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {draft.social_links.map((link, index) => (
            <div key={index} className={`rounded-xl border p-3 ${isDayMode ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"}`}>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[120px_1fr]">
                <select value={link.platform} onChange={(event) => updateLink(index, { platform: event.target.value })} className={inputClass}>
                  {PLATFORM_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <input value={link.url} onChange={(event) => updateLink(index, { url: event.target.value })} className={inputClass} placeholder="链接、邮箱或微信号" />
                <input value={link.label} onChange={(event) => updateLink(index, { label: event.target.value })} className={`${inputClass} sm:col-span-2`} placeholder="展示名称，可选" />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => { setDraft((prev) => ({ ...prev, social_links: moveItem(prev.social_links, index, -1) })); markState("socials", "dirty"); }} className="rounded-lg px-2 py-1 text-xs font-bold bg-black/10"><ArrowUp size={14} /></button>
                <button type="button" onClick={() => { setDraft((prev) => ({ ...prev, social_links: moveItem(prev.social_links, index, 1) })); markState("socials", "dirty"); }} className="rounded-lg px-2 py-1 text-xs font-bold bg-black/10"><ArrowDown size={14} /></button>
                <button type="button" onClick={() => updateLink(index, { is_visible: !link.is_visible })} className="rounded-lg px-2 py-1 text-xs font-bold bg-black/10">{link.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                <button type="button" onClick={() => { setDraft((prev) => ({ ...prev, social_links: prev.social_links.filter((_, i) => i !== index) })); markState("socials", "dirty"); }} className="rounded-lg px-2 py-1 text-xs font-bold bg-rose-600 text-white"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => saveSection("socials")} className={`${buttonClass} mt-3`} disabled={saveStates.socials === "saving"}>
          保存社交链接
        </button>
      </div>

      <div className={`rounded-2xl border p-4 ${isDayMode ? "border-slate-200 bg-slate-50/80" : "border-white/10 bg-black/20"}`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className={`text-sm font-bold ${isDayMode ? "text-slate-800" : "text-white"}`}>自定义卡片</div>
          <div className="flex items-center gap-3">
            <SaveState state={saveStates.cardsOrder} isDayMode={isDayMode} />
            <button type="button" onClick={() => saveSection("cardsOrder")} className={buttonClass} disabled={saveStates.cardsOrder === "saving"}>保存卡片排序</button>
            <button type="button" onClick={() => { setDraft((prev) => ({ ...prev, cards: [...prev.cards, emptyCard()] })); markState("cardsOrder", "dirty"); }} className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white">
              <Plus size={14} /> 添加
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {draft.cards.map((card, index) => (
            <div
              key={index}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => { reorderCards(dragIndex, index); setDragIndex(null); }}
              className={`rounded-xl border p-3 ${isDayMode ? "border-slate-200 bg-white" : "border-white/10 bg-white/5"}`}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className={`inline-flex items-center gap-2 text-xs font-bold ${isDayMode ? "text-slate-500" : "text-gray-400"}`}>
                  <GripVertical size={15} /> 拖动调整顺序
                </div>
                <SaveState state={saveStates.cards[index] || "saved"} isDayMode={isDayMode} />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[140px_1fr]">
                <select value={card.card_type} onChange={(event) => updateCard(index, { card_type: event.target.value })} className={inputClass}>
                  {CARD_TYPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                {card.card_type === "other" ? (
                  <input value={card.custom_type} onChange={(event) => updateCard(index, { custom_type: event.target.value })} className={inputClass} placeholder="自定义类型名称" />
                ) : (
                  <input value={card.link_url} onChange={(event) => updateCard(index, { link_url: event.target.value })} className={inputClass} placeholder="跳转链接，可选" />
                )}
              </div>
              {card.card_type === "other" && (
                <input value={card.link_url} onChange={(event) => updateCard(index, { link_url: event.target.value })} className={`${inputClass} mt-2`} placeholder="跳转链接，可选" />
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {ASPECT_RATIO_OPTIONS.map(([value, label]) => (
                  <button key={value} type="button" onClick={() => updateCard(index, { aspect_ratio: value })} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${card.aspect_ratio === value ? "bg-indigo-600 text-white" : isDayMode ? "bg-slate-100 text-slate-600" : "bg-white/10 text-gray-300"}`}>
                    {label}
                  </button>
                ))}
              </div>
              <div className={`mt-2 overflow-hidden rounded-xl border ${isDayMode ? "border-slate-200 bg-slate-50" : "border-white/10 bg-black/20"}`}>
                {card.cover_url ? (
                  <div data-crop-box className="relative mx-auto w-full max-w-2xl overflow-hidden select-none" style={{ aspectRatio: getAspectRatio(card.aspect_ratio) }}>
                    <img src={card.cover_url} alt="自定义卡片原图" className="absolute inset-0 h-full w-full object-cover opacity-30" draggable={false} />
                    <div
                      className="absolute cursor-move overflow-hidden border-2 border-white bg-black/10 shadow-[0_0_0_999px_rgba(0,0,0,0.42)]"
                      style={{
                        left: `${card.crop_x * 100}%`,
                        top: `${card.crop_y * 100}%`,
                        width: `${card.crop_width * 100}%`,
                        height: `${card.crop_height * 100}%`,
                      }}
                      onPointerDown={(event) => startCropDrag(event, index, "move")}
                    >
                      <img
                        src={card.cover_url}
                        alt="裁切预览"
                        className="absolute max-w-none"
                        draggable={false}
                        style={getCroppedImageStyle(card)}
                      />
                      {[
                        ["nw", "-left-2 -top-2 cursor-nwse-resize"],
                        ["ne", "-right-2 -top-2 cursor-nesw-resize"],
                        ["sw", "-bottom-2 -left-2 cursor-nesw-resize"],
                        ["se", "-bottom-2 -right-2 cursor-nwse-resize"],
                      ].map(([mode, positionClass]) => (
                        <button
                          key={mode}
                          type="button"
                          aria-label="调整裁切范围"
                          onPointerDown={(event) => startCropDrag(event, index, mode)}
                          className={`absolute h-4 w-4 rounded-full border-2 border-white bg-indigo-600 shadow ${positionClass}`}
                        />
                      ))}
                      <div className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-[10px] font-bold text-white drop-shadow">拖动中间移动，拖四角缩放</div>
                    </div>
                  </div>
                ) : (
                  <div className={`flex aspect-video w-full items-center justify-center text-sm ${isDayMode ? "text-slate-400" : "text-gray-500"}`}>暂未上传封面</div>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <label className={`inline-flex min-h-[36px] cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${isDayMode ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "bg-white/10 text-white hover:bg-white/15"}`}>
                  <Upload size={14} />
                  {coverUploadingIndex === index ? "上传中..." : "上传封面"}
                  <input type="file" accept="image/*" className="sr-only" disabled={coverUploadingIndex === index} onChange={(event) => handleCoverUpload(index, event.target.files?.[0])} />
                </label>
                {card.cover_url && (
                  <button type="button" onClick={() => updateCard(index, { crop_x: 0.1, crop_y: 0.1, crop_width: 0.8, crop_height: 0.8 })} className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold ${isDayMode ? "bg-slate-100 text-slate-700" : "bg-white/10 text-white"}`}>
                    <RotateCcw size={14} /> 重置裁切
                  </button>
                )}
                <span className={`text-xs ${isDayMode ? "text-slate-500" : "text-gray-500"}`}>拖动四角缩放裁切框，拖动中间移动位置。</span>
              </div>
              <textarea value={card.description} onChange={(event) => updateCard(index, { description: event.target.value })} rows={2} maxLength={80} className={`${inputClass} mt-2 resize-none`} placeholder="描述，会显示为封面左下角的小角标" />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => { setDraft((prev) => ({ ...prev, cards: moveItem(prev.cards, index, -1) })); markState("cardsOrder", "dirty"); }} className="rounded-lg px-2 py-1 text-xs font-bold bg-black/10"><ArrowUp size={14} /></button>
                <button type="button" onClick={() => { setDraft((prev) => ({ ...prev, cards: moveItem(prev.cards, index, 1) })); markState("cardsOrder", "dirty"); }} className="rounded-lg px-2 py-1 text-xs font-bold bg-black/10"><ArrowDown size={14} /></button>
                <button type="button" onClick={() => updateCard(index, { is_visible: !card.is_visible })} className="rounded-lg px-2 py-1 text-xs font-bold bg-black/10">{card.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                <button type="button" onClick={() => { setDraft((prev) => ({ ...prev, cards: prev.cards.filter((_, i) => i !== index) })); markState("cardsOrder", "dirty"); }} className="rounded-lg bg-rose-600 px-2 py-1 text-xs font-bold text-white"><Trash2 size={14} /></button>
                <button type="button" onClick={() => saveSection("card", index)} className={`${buttonClass} ml-auto`} disabled={saveStates.cards[index] === "saving"}>
                  保存此卡片
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfileCardEditor;
