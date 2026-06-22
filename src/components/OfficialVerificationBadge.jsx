import { BadgeCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  getVerificationBadgeKey,
  getVerificationBadgeKind,
} from "../utils/profileVerification";

const OfficialVerificationBadge = ({
  profile,
  compact = false,
  isDayMode = true,
  className = "",
}) => {
  const { t } = useTranslation();
  const key = getVerificationBadgeKey(profile);
  if (!key) return null;

  const pending = getVerificationBadgeKind(profile) === "pending";
  const label = t(key);

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-[5px] border font-black ${
        compact ? "px-1.5 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
      } ${
        pending
          ? isDayMode
            ? "border-slate-200 bg-slate-100 text-slate-600"
            : "border-white/10 bg-white/10 text-slate-200"
          : isDayMode
            ? "border-sky-200 bg-sky-50 text-sky-700"
            : "border-sky-300/20 bg-sky-400/10 text-sky-100"
      } ${className}`}
      title={label}
    >
      <BadgeCheck size={compact ? 13 : 14} />
      {compact ? <span className="sr-only">{label}</span> : label}
    </span>
  );
};

export default OfficialVerificationBadge;
