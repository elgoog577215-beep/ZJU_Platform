import React from "react";
import { ExternalLink } from "lucide-react";

const CARD_TYPE_LABELS = {
  project: "项目",
  work: "作品",
  article: "文章",
  event: "活动",
  experience: "经历",
  resource: "资源",
  social: "社交入口",
  other: "其他",
};

const getCardView = (card) => {
  const cover = card.cover_url || card.images?.[0] || "";
  const link = card.link_url || card.links?.[0]?.url || "";
  const typeLabel = card.custom_type || CARD_TYPE_LABELS[card.card_type] || card.title || "自定义";
  const description = card.description || card.note || card.body || "";
  const cropWidth = Math.min(1, Math.max(0.05, Number(card.crop_width) || 1));
  const cropHeight = Math.min(1, Math.max(0.05, Number(card.crop_height) || 1));
  const cropX = Math.min(1 - cropWidth, Math.max(0, Number(card.crop_x) || 0));
  const cropY = Math.min(1 - cropHeight, Math.max(0, Number(card.crop_y) || 0));
  return { cover, link, typeLabel, description, cropX, cropY, cropWidth, cropHeight };
};

const getCroppedImageStyle = ({ cropX, cropY, cropWidth, cropHeight }) => ({
  width: `${100 / cropWidth}%`,
  height: `${100 / cropHeight}%`,
  left: `-${(cropX * 100) / cropWidth}%`,
  top: `-${(cropY * 100) / cropHeight}%`,
  objectFit: "cover",
});

const getAspectRatio = (value) => {
  if (value === "square") return "1 / 1";
  if (value === "landscape") return "4 / 3";
  if (value === "portrait" || value === "tall") return "3 / 4";
  if (value === "vertical") return "9 / 16";
  if (value === "large") return "16 / 10";
  return "16 / 9";
};

const getCardSpanClass = (value) => {
  if (value === "large") return "md:col-span-12";
  if (value === "vertical" || value === "portrait" || value === "tall") return "md:col-span-4";
  if (value === "square") return "md:col-span-6 lg:col-span-4";
  return "md:col-span-6";
};

const ProfileCustomCards = ({ cards = [], isDayMode }) => {
  if (!cards.length) return null;

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
      {cards.map((card) => {
        const { cover, link, typeLabel, description, cropX, cropY, cropWidth, cropHeight } = getCardView(card);
        const Wrapper = link ? "a" : "article";
        const wrapperProps = link
          ? { href: link, target: "_blank", rel: "noreferrer" }
          : {};

        return (
          <Wrapper
            key={card.id || `${typeLabel}-${card.sort_order}`}
            {...wrapperProps}
            className={`group relative block overflow-hidden rounded-2xl border ${getCardSpanClass(card.aspect_ratio)} ${
              isDayMode
                ? "border-slate-200/80 bg-white text-slate-900 shadow-[0_14px_30px_rgba(148,163,184,0.12)]"
                : "border-white/10 bg-white/[0.05] text-white"
            } ${link ? "transition-transform hover:-translate-y-0.5" : ""}`}
          >
            {cover ? (
              <div className="relative w-full overflow-hidden" style={{ aspectRatio: getAspectRatio(card.aspect_ratio) }}>
                <img
                  src={cover}
                  alt={typeLabel}
                  className="absolute max-w-none transition-transform duration-300 group-hover:scale-[1.02]"
                  style={getCroppedImageStyle({ cropX, cropY, cropWidth, cropHeight })}
                />
              </div>
            ) : (
              <div className={`flex w-full items-center justify-center ${isDayMode ? "bg-slate-100 text-slate-400" : "bg-white/5 text-gray-500"}`} style={{ aspectRatio: getAspectRatio(card.aspect_ratio) }}>
                {typeLabel}
              </div>
            )}
            <div className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-xs font-bold text-white backdrop-blur">
              {typeLabel}
            </div>
            {description && (
              <div className="absolute bottom-3 left-3 max-w-[calc(100%-24px)] rounded-lg bg-black/60 px-3 py-1.5 text-xs font-semibold leading-snug text-white backdrop-blur line-clamp-2">
                {description}
              </div>
            )}
            {link && (
              <div className="absolute right-3 top-3 rounded-full bg-black/45 p-2 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                <ExternalLink size={15} />
              </div>
            )}
            {!card.is_visible && (
              <div className={`px-3 py-2 text-xs ${isDayMode ? "text-amber-600" : "text-amber-300"}`}>
                已隐藏，仅自己可见
              </div>
            )}
          </Wrapper>
        );
      })}
    </div>
  );
};

export default ProfileCustomCards;
