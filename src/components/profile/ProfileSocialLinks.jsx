import React from "react";
import {
  AtSign,
  Github,
  Globe,
  Link as LinkIcon,
  Mail,
  MessageCircle,
  Video,
} from "lucide-react";
import toast from "react-hot-toast";

const PLATFORM_META = {
  wechat: { label: "微信", icon: MessageCircle, copy: true },
  github: { label: "GitHub", icon: Github },
  twitter: { label: "X", icon: AtSign },
  xiaohongshu: { label: "小红书", icon: LinkIcon },
  bilibili: { label: "B站", icon: Video },
  email: { label: "邮箱", icon: Mail, mail: true },
  website: { label: "网站", icon: Globe },
  zhihu: { label: "知乎", icon: LinkIcon },
  linkedin: { label: "LinkedIn", icon: LinkIcon },
  custom: { label: "链接", icon: LinkIcon },
};

const openSocialLink = async (link) => {
  const meta = PLATFORM_META[link.platform] || PLATFORM_META.custom;
  if (meta.copy) {
    await navigator.clipboard?.writeText(link.url);
    toast.success("联系方式已复制");
    return;
  }
  const href = meta.mail && !String(link.url).startsWith("mailto:")
    ? `mailto:${link.url}`
    : link.url;
  window.open(href, "_blank", "noopener,noreferrer");
};

const ProfileSocialLinks = ({ links = [], isDayMode }) => {
  if (!links.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {links.map((link) => {
        const meta = PLATFORM_META[link.platform] || PLATFORM_META.custom;
        const Icon = meta.icon;
        return (
          <button
            key={link.id || `${link.platform}-${link.url}`}
            type="button"
            title={link.label || meta.label}
            onClick={() => openSocialLink(link)}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
              isDayMode
                ? "border-slate-200 bg-white/80 text-slate-700 hover:border-indigo-300 hover:text-indigo-600"
                : "border-white/10 bg-white/8 text-gray-200 hover:border-indigo-300/50 hover:text-white"
            }`}
          >
            <Icon size={18} />
          </button>
        );
      })}
    </div>
  );
};

export default ProfileSocialLinks;
