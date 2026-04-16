import React, { useEffect, useMemo, useState } from "react";
import { LayoutTemplate, Save, Globe, FileText, Mail, Upload } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";
import {
  AdminButton,
  AdminLoadingState,
  AdminPageShell,
  AdminPanel,
  FilterChip,
} from "./AdminUI";

const PageContentEditor = () => {
  const [activeSection, setActiveSection] = useState("home");
  const [settings, setSettings] = useState({});
  const [initialSettings, setInitialSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get("/settings");
      const nextSettings = response.data || {};
      setSettings(nextSettings);
      setInitialSettings(nextSettings);
    } catch {
      toast.error("加载页面内容失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (key, value) => {
    setSettings((previous) => ({ ...previous, [key]: value }));
  };

  const handleImageUpload = async (event, key) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const uploadingToast = toast.loading("正在上传图片...");

    try {
      const response = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (response.data.fileUrl) {
        handleChange(key, response.data.fileUrl);
        toast.success("图片上传成功", { id: uploadingToast });
      }
    } catch {
      toast.error("图片上传失败", { id: uploadingToast });
    }
  };

  const sectionFields = useMemo(
    () => ({
      home: ["site_title", "favicon_url", "hero_title", "hero_subtitle", "hero_bg_url"],
      about: [
        "about_title",
        "about_subtitle",
        "profile_image_url",
        "about_intro",
        "about_detail",
        "about_exp_years",
        "about_exhibitions",
        "about_projects",
      ],
      contact: [
        "contact_email",
        "contact_phone",
        "contact_address",
        "social_github",
        "social_twitter",
        "social_instagram",
        "social_linkedin",
      ],
    }),
    [],
  );

  const hasDirtyFields = sectionFields[activeSection].some(
    (key) => String(settings[key] ?? "") !== String(initialSettings[key] ?? ""),
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const key of sectionFields[activeSection]) {
        if (String(settings[key] ?? "") === String(initialSettings[key] ?? "")) {
          continue;
        }
        await api.post("/settings", { key, value: settings[key] ?? "" });
      }
      setInitialSettings((previous) => ({
        ...previous,
        ...Object.fromEntries(
          sectionFields[activeSection].map((key) => [key, settings[key] ?? ""]),
        ),
      }));
      toast.success("页面内容已保存");
    } catch {
      toast.error("保存页面内容失败");
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { id: "home", label: "首页", icon: Globe },
    { id: "about", label: "关于页", icon: FileText },
    { id: "contact", label: "联系页", icon: Mail },
  ];

  if (loading) {
    return <AdminLoadingState text="正在加载页面内容..." />;
  }

  return (
    <AdminPageShell
      title="页面内容编辑"
      description="这里维护首页、关于页和联系页的静态文字与图片链接。保存会逐项写入当前后端 settings 表。"
      actions={
        <AdminButton
          tone={hasDirtyFields ? "primary" : "subtle"}
          disabled={saving}
          onClick={handleSave}
        >
          <Save size={16} />
          {saving ? "保存中..." : hasDirtyFields ? "保存当前分区" : "当前分区已保存"}
        </AdminButton>
      }
    >
      <AdminPanel
        title="编辑分区"
        description="分区切换只影响当前可编辑字段，不会丢失未保存内容。"
        action={<LayoutTemplate size={18} className="text-indigo-300" />}
      >
        <div className="flex flex-wrap gap-2">
          {sections.map((section) => (
            <FilterChip
              key={section.id}
              active={activeSection === section.id}
              onClick={() => setActiveSection(section.id)}
            >
              <section.icon size={14} />
              {section.label}
            </FilterChip>
          ))}
        </div>
      </AdminPanel>

      <AdminPanel title={sections.find((item) => item.id === activeSection)?.label}>
        <div className="grid max-w-4xl gap-5">
          {activeSection === "home" ? (
            <>
              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  label="站点标题"
                  value={settings.site_title || ""}
                  onChange={(value) => handleChange("site_title", value)}
                />
                <Field
                  label="Favicon URL"
                  value={settings.favicon_url || ""}
                  onChange={(value) => handleChange("favicon_url", value)}
                />
              </div>
              <Field
                label="Hero 标题"
                value={settings.hero_title || ""}
                onChange={(value) => handleChange("hero_title", value)}
              />
              <Field
                label="Hero 副标题"
                value={settings.hero_subtitle || ""}
                onChange={(value) => handleChange("hero_subtitle", value)}
              />
              <ImageField
                label="Hero 背景图"
                value={settings.hero_bg_url || ""}
                onChange={(value) => handleChange("hero_bg_url", value)}
                onUpload={(event) => handleImageUpload(event, "hero_bg_url")}
              />
            </>
          ) : null}

          {activeSection === "about" ? (
            <>
              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  label="关于页标题"
                  value={settings.about_title || ""}
                  onChange={(value) => handleChange("about_title", value)}
                />
                <Field
                  label="关于页副标题"
                  value={settings.about_subtitle || ""}
                  onChange={(value) => handleChange("about_subtitle", value)}
                />
              </div>
              <ImageField
                label="头像图片链接"
                value={settings.profile_image_url || ""}
                onChange={(value) => handleChange("profile_image_url", value)}
              />
              <TextareaField
                label="简介"
                value={settings.about_intro || ""}
                onChange={(value) => handleChange("about_intro", value)}
                rows={4}
              />
              <TextareaField
                label="详细介绍"
                value={settings.about_detail || ""}
                onChange={(value) => handleChange("about_detail", value)}
                rows={6}
              />
              <div className="grid gap-5 md:grid-cols-3">
                <Field
                  label="经验年限"
                  value={settings.about_exp_years || ""}
                  onChange={(value) => handleChange("about_exp_years", value)}
                />
                <Field
                  label="展览数量"
                  value={settings.about_exhibitions || ""}
                  onChange={(value) => handleChange("about_exhibitions", value)}
                />
                <Field
                  label="项目数量"
                  value={settings.about_projects || ""}
                  onChange={(value) => handleChange("about_projects", value)}
                />
              </div>
            </>
          ) : null}

          {activeSection === "contact" ? (
            <>
              <Field
                label="联系邮箱"
                value={settings.contact_email || ""}
                onChange={(value) => handleChange("contact_email", value)}
              />
              <Field
                label="联系电话"
                value={settings.contact_phone || ""}
                onChange={(value) => handleChange("contact_phone", value)}
              />
              <Field
                label="联系地址"
                value={settings.contact_address || ""}
                onChange={(value) => handleChange("contact_address", value)}
              />
              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  label="GitHub"
                  value={settings.social_github || ""}
                  onChange={(value) => handleChange("social_github", value)}
                />
                <Field
                  label="Twitter / X"
                  value={settings.social_twitter || ""}
                  onChange={(value) => handleChange("social_twitter", value)}
                />
                <Field
                  label="Instagram"
                  value={settings.social_instagram || ""}
                  onChange={(value) => handleChange("social_instagram", value)}
                />
                <Field
                  label="LinkedIn"
                  value={settings.social_linkedin || ""}
                  onChange={(value) => handleChange("social_linkedin", value)}
                />
              </div>
            </>
          ) : null}
        </div>
      </AdminPanel>
    </AdminPageShell>
  );
};

const baseInputClassName =
  "theme-admin-input w-full rounded-xl p-3";

const Field = ({ label, value, onChange }) => (
  <div>
    <label className="mb-2 block text-sm font-medium text-gray-400">{label}</label>
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={baseInputClassName}
    />
  </div>
);

const TextareaField = ({ label, value, onChange, rows = 4 }) => (
  <div>
    <label className="mb-2 block text-sm font-medium text-gray-400">{label}</label>
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={rows}
      className={baseInputClassName}
    />
  </div>
);

const ImageField = ({ label, value, onChange, onUpload }) => (
  <div>
    <label className="mb-2 block text-sm font-medium text-gray-400">{label}</label>
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={baseInputClassName}
      />
      {onUpload ? (
        <label className="theme-button-secondary inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl px-4">
          <Upload size={18} />
          <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
        </label>
      ) : null}
    </div>
    {value ? (
      <img
        src={value}
        alt={label}
        className="mt-4 h-36 w-full rounded-2xl border border-white/10 object-cover"
      />
    ) : null}
  </div>
);

export default PageContentEditor;
