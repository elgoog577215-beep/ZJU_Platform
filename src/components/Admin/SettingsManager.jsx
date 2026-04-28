import React, { useEffect, useMemo, useState } from "react";
import { Key, Globe, Sun, Save, FileText } from "lucide-react";
import toast from "react-hot-toast";
import { useSettings } from "../../context/SettingsContext";
import api from "../../services/api";
import {
  AdminButton,
  AdminLoadingState,
  AdminPageShell,
  AdminPanel,
} from "./AdminUI";

const SettingsManager = () => {
  const { updateSetting: updateGlobalSetting } = useSettings();
  const [settings, setSettings] = useState({});
  const [initialSettings, setInitialSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get("/settings");
      const nextSettings = response.data || {};
      setSettings(nextSettings);
      setInitialSettings(nextSettings);
    } catch {
      toast.error("加载系统设置失败");
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

  const handleSave = async (key, value) => {
    setSavingKey(key);
    try {
      await updateGlobalSetting(key, value);
      setInitialSettings((previous) => ({ ...previous, [key]: value }));
      toast.success("设置已保存");
    } catch {
      toast.error("设置保存失败");
    } finally {
      setSavingKey("");
    }
  };

  const dirtyMap = useMemo(() => {
    const result = {};
    for (const [key, value] of Object.entries(settings)) {
      result[key] = String(value ?? "") !== String(initialSettings[key] ?? "");
    }
    return result;
  }, [initialSettings, settings]);

  const fieldAction = (key) => (
    <AdminButton
      tone={dirtyMap[key] ? "primary" : "subtle"}
      disabled={savingKey === key}
      onClick={() => handleSave(key, settings[key])}
    >
      <Save size={16} />
      {savingKey === key ? "保存中..." : dirtyMap[key] ? "保存修改" : "已保存"}
    </AdminButton>
  );

  if (loading) {
    return <AdminLoadingState text="正在加载系统设置..." />;
  }

  return (
    <AdminPageShell
      title="系统设置"
      description="这里只调整当前后端已经支持的配置项。字段显示为“已修改未保存”时，表示仅存在前端草稿。"
    >
      <AdminPanel
        title="安全设置"
        description="邀请码不会通过读取接口返回，所以这里只支持重新设置，不显示旧值。"
        action={<Key size={18} className="text-indigo-300" />}
      >
        <div className="grid gap-5">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              组织邀请码
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <input
                type="text"
                value={settings.invite_code || ""}
                onChange={(event) => handleChange("invite_code", event.target.value)}
                placeholder="输入新的邀请码"
                  className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("invite_code")}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              仅当你主动输入新邀请码时才会覆盖当前配置。
            </p>
          </div>
        </div>
      </AdminPanel>

      <AdminPanel
        title="站点设置"
        description="面向全站的基础文字和品牌配置。"
        action={<Globe size={18} className="text-indigo-300" />}
      >
        <div className="grid gap-5">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              站点名称
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <input
                type="text"
                value={settings.site_name || ""}
                onChange={(event) => handleChange("site_name", event.target.value)}
                  className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("site_name")}
            </div>
          </div>
        </div>
      </AdminPanel>

      <AdminPanel
        title="外观设置"
        description="背景参数会实时影响站点公共视觉。建议改动后回前台检查实际效果。"
        action={<Sun size={18} className="text-indigo-300" />}
      >
        <div className="grid gap-5">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-400">
                  背景亮度 ({settings.background_brightness || 1})
                </label>
                <input
                  type="range"
                  min="0.2"
                  max="2"
                  step="0.1"
                  value={settings.background_brightness || 1}
                  onChange={(event) =>
                    handleChange("background_brightness", event.target.value)
                  }
                  className="mt-3 w-full"
                />
                <p className="mt-2 text-xs text-gray-500">
                  控制背景整体亮度，适合在视觉偏暗或偏亮时微调。
                </p>
              </div>
              {fieldAction("background_brightness")}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-400">
                  Bloom 强度 ({settings.background_bloom || 0.8})
                </label>
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="0.1"
                  value={settings.background_bloom || 0.8}
                  onChange={(event) =>
                    handleChange("background_bloom", event.target.value)
                  }
                  className="mt-3 w-full"
                />
                <p className="mt-2 text-xs text-gray-500">
                  控制发光程度，数值过高会明显影响可读性。
                </p>
              </div>
              {fieldAction("background_bloom")}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-400">
                  暗角强度 ({settings.background_vignette || 0.5})
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.background_vignette || 0.5}
                  onChange={(event) =>
                    handleChange("background_vignette", event.target.value)
                  }
                  className="mt-3 w-full"
                />
                <p className="mt-2 text-xs text-gray-500">
                  控制边缘暗角，适合突出中心主体但不宜过重。
                </p>
              </div>
              {fieldAction("background_vignette")}
            </div>
          </div>
        </div>
      </AdminPanel>

      <AdminPanel
        title="关于页面"
        description="关于页面的所有内容均可在此编辑，修改后前台实时生效。"
        action={<FileText size={18} className="text-indigo-300" />}
      >
        <div className="grid gap-5">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              团队标题
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <input
                type="text"
                value={settings.about_team_title || ""}
                onChange={(event) => handleChange("about_team_title", event.target.value)}
                placeholder="浙大 AI 生态团队"
                className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("about_team_title")}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              关于页面顶部大标题，建议控制在 10 个字符以内。
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              团队副标题 / 一句话介绍
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <input
                type="text"
                value={settings.about_team_subtitle || ""}
                onChange={(event) => handleChange("about_team_subtitle", event.target.value)}
                placeholder="连接校园 AI 资源、社群、赛事与实践场景的组织化入口。"
                className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("about_team_subtitle")}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              团队介绍 - 第一段
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <textarea
                value={settings.about_team_intro_1 || ""}
                onChange={(event) => handleChange("about_team_intro_1", event.target.value)}
                placeholder="我们不是单一社团，也不是只做一场比赛的短期项目组，而是面向浙江大学校园长期运行的 AI 生态整合团队。"
                rows={3}
                className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("about_team_intro_1")}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              团队介绍 - 第二段
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <textarea
                value={settings.about_team_intro_2 || ""}
                onChange={(event) => handleChange("about_team_intro_2", event.target.value)}
                placeholder="社区与赛事，是我们推动生态落地的两条主线；真正的主体，是负责把资源、组织与持续运行串联起来的团队本身。"
                rows={3}
                className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("about_team_intro_2")}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              支持单位（逗号分隔）
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <input
                type="text"
                value={settings.about_support_units || ""}
                onChange={(event) => handleChange("about_support_units", event.target.value)}
                placeholder="未来学习中心,ZJUAI,XLab"
                className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("about_support_units")}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              用英文逗号分隔多个支持单位名称。
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              数据指标 1 - 数值
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <input
                type="text"
                value={settings.about_stat_1_value || ""}
                onChange={(event) => handleChange("about_stat_1_value", event.target.value)}
                placeholder="1000+"
                className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("about_stat_1_value")}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              数据指标 1 - 描述
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <input
                type="text"
                value={settings.about_stat_1_label || ""}
                onChange={(event) => handleChange("about_stat_1_label", event.target.value)}
                placeholder="活动平台现有用户基础"
                className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("about_stat_1_label")}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              数据指标 2 - 数值
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <input
                type="text"
                value={settings.about_stat_2_value || ""}
                onChange={(event) => handleChange("about_stat_2_value", event.target.value)}
                placeholder="3 层"
                className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("about_stat_2_value")}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              数据指标 2 - 描述
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <input
                type="text"
                value={settings.about_stat_2_label || ""}
                onChange={(event) => handleChange("about_stat_2_label", event.target.value)}
                placeholder="社区递进式连接结构"
                className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("about_stat_2_label")}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              数据指标 3 - 数值
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <input
                type="text"
                value={settings.about_stat_3_value || ""}
                onChange={(event) => handleChange("about_stat_3_value", event.target.value)}
                placeholder="5 小时"
                className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("about_stat_3_value")}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              数据指标 3 - 描述
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <input
                type="text"
                value={settings.about_stat_3_label || ""}
                onChange={(event) => handleChange("about_stat_3_label", event.target.value)}
                placeholder="黑客松核心标识"
                className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("about_stat_3_label")}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              AI 社区 - 标题
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <input
                type="text"
                value={settings.about_community_title || ""}
                onChange={(event) => handleChange("about_community_title", event.target.value)}
                placeholder="AI 社区"
                className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("about_community_title")}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              AI 社区 - 标签
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <input
                type="text"
                value={settings.about_community_tagline || ""}
                onChange={(event) => handleChange("about_community_tagline", event.target.value)}
                placeholder="日常运行层"
                className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("about_community_tagline")}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              AI 社区 - 描述
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <textarea
                value={settings.about_community_desc || ""}
                onChange={(event) => handleChange("about_community_desc", event.target.value)}
                placeholder="持续搭建公开学习入口、私域社群连接与线下 Meetup，让校园内的 AI 学习、交流与协作形成稳定的日常机制。"
                rows={3}
                className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("about_community_desc")}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              AI 社区 - 要点（每行一个）
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <textarea
                value={settings.about_community_bullets || ""}
                onChange={(event) => handleChange("about_community_bullets", event.target.value)}
                placeholder={"公开内容与知识入口\n社群连接与私域沉淀\n线下 Meetup 与人群链接"}
                rows={4}
                className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("about_community_bullets")}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              黑客松 - 标题
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <input
                type="text"
                value={settings.about_hackathon_title || ""}
                onChange={(event) => handleChange("about_hackathon_title", event.target.value)}
                placeholder="AI 全栈极速黑客松"
                className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("about_hackathon_title")}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              黑客松 - 标签
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <input
                type="text"
                value={settings.about_hackathon_tagline || ""}
                onChange={(event) => handleChange("about_hackathon_tagline", event.target.value)}
                placeholder="标杆项目层"
                className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("about_hackathon_tagline")}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              黑客松 - 描述
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <textarea
                value={settings.about_hackathon_desc || ""}
                onChange={(event) => handleChange("about_hackathon_desc", event.target.value)}
                placeholder="以 5 小时、纯个人、零路演、AI 原生开发为识别点，作为生态团队对外最具辨识度的技术品牌项目。"
                rows={3}
                className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("about_hackathon_desc")}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              黑客松 - 要点（每行一个）
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <textarea
                value={settings.about_hackathon_bullets || ""}
                onChange={(event) => handleChange("about_hackathon_bullets", event.target.value)}
                placeholder={"5 小时极速开发\n纯个人参赛机制\n零路演与 AI 原生开发"}
                rows={4}
                className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("about_hackathon_bullets")}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              社区与比赛 - 大标题
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <input
                type="text"
                value={settings.about_flagship_title || ""}
                onChange={(event) => handleChange("about_flagship_title", event.target.value)}
                placeholder="社区与比赛，是我们推动生态落地的两条主线"
                className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("about_flagship_title")}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              社区与比赛 - 补充说明
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <textarea
                value={settings.about_flagship_note || ""}
                onChange={(event) => handleChange("about_flagship_note", event.target.value)}
                placeholder="这两部分不是与团队并列的身份，而是生态团队对内持续运营、对外形成影响力的代表性产品与活动。"
                rows={3}
                className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("about_flagship_note")}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              支持网络 - 标题
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <input
                type="text"
                value={settings.about_support_title || ""}
                onChange={(event) => handleChange("about_support_title", event.target.value)}
                placeholder="让生态持续运行的支持网络"
                className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("about_support_title")}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              支持网络 - 描述
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <textarea
                value={settings.about_support_desc || ""}
                onChange={(event) => handleChange("about_support_desc", event.target.value)}
                placeholder="我们以组织协同而不是单点活动的方式推进校园 AI 生态，把支持单位、学生组织、技术社群与项目实践连接成一张稳定运转的网络。"
                rows={3}
                className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("about_support_desc")}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              支持网络 - 定位 (Positioning)
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <input
                type="text"
                value={settings.about_support_positioning || ""}
                onChange={(event) => handleChange("about_support_positioning", event.target.value)}
                placeholder="统一校园 AI 资源、信息与协作入口"
                className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("about_support_positioning")}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              支持网络 - 方法 (Method)
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <input
                type="text"
                value={settings.about_support_method || ""}
                onChange={(event) => handleChange("about_support_method", event.target.value)}
                placeholder="以社区、赛事与连接机制带动生态落地"
                className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("about_support_method")}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              支持网络 - 成果 (Result)
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <input
                type="text"
                value={settings.about_support_result || ""}
                onChange={(event) => handleChange("about_support_result", event.target.value)}
                placeholder="形成可被持续运营与持续扩展的校园网络"
                className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("about_support_result")}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              结尾 - 标题
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <input
                type="text"
                value={settings.about_final_title || ""}
                onChange={(event) => handleChange("about_final_title", event.target.value)}
                placeholder="我们在建设的，是一张校园 AI 的连接网络"
                className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("about_final_title")}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              结尾 - 描述
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <textarea
                value={settings.about_final_desc || ""}
                onChange={(event) => handleChange("about_final_desc", event.target.value)}
                placeholder="如果你关注 AI 学习、校园社群、技术赛事、项目合作或跨组织联动，这里就是浙大 AI 生态团队的官方介绍入口。"
                rows={3}
                className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("about_final_desc")}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              结尾 - 备注
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <input
                type="text"
                value={settings.about_final_note || ""}
                onChange={(event) => handleChange("about_final_note", event.target.value)}
                placeholder="以组织协同、社区运营与标杆赛事，持续推动校园 AI 生态扩展。"
                className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("about_final_note")}
            </div>
          </div>
        </div>
      </AdminPanel>

      <AdminPanel
        title="黑客松页面设置"
        description="黑客松报名页面的标题、时间和合作方配置。"
        action={<FileText size={18} className="text-indigo-300" />}
      >
        <div className="grid gap-5">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              黑客松 - 标题
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <input
                type="text"
                value={settings.hackathon_title || ""}
                onChange={(event) => handleChange("hackathon_title", event.target.value)}
                placeholder="AI 全栈极速黑客松"
                className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("hackathon_title")}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              黑客松 - 副标题
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <input
                type="text"
                value={settings.hackathon_subtitle || ""}
                onChange={(event) => handleChange("hackathon_subtitle", event.target.value)}
                placeholder="5 小时极速开发 · 纯个人参赛 · AI 原生创作"
                className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("hackathon_subtitle")}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              黑客松 - 比赛时间
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <input
                type="text"
                value={settings.hackathon_date || ""}
                onChange={(event) => handleChange("hackathon_date", event.target.value)}
                placeholder="5 月 10 日 9:00 A.M."
                className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("hackathon_date")}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              黑客松 - 比赛地点
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <input
                type="text"
                value={settings.hackathon_location || ""}
                onChange={(event) => handleChange("hackathon_location", event.target.value)}
                placeholder="北 1-114"
                className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("hackathon_location")}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              黑客松 - 比赛形式
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <input
                type="text"
                value={settings.hackathon_format || ""}
                onChange={(event) => handleChange("hackathon_format", event.target.value)}
                placeholder="个人赛"
                className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("hackathon_format")}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              黑客松 - 比赛时长
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <input
                type="text"
                value={settings.hackathon_duration || ""}
                onChange={(event) => handleChange("hackathon_duration", event.target.value)}
                placeholder="5 小时"
                className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("hackathon_duration")}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              黑客松 - 描述
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <textarea
                value={settings.hackathon_desc || ""}
                onChange={(event) => handleChange("hackathon_desc", event.target.value)}
                placeholder="AI 全栈极速黑客松是以 AI 原生开发为核心的技术赛事，参赛者需在 5 小时内独立完成一个完整的 AI 应用项目。比赛强调快速原型开发、AI 工具运用与创新思维。"
                rows={3}
                className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("hackathon_desc")}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="mb-2 block text-sm font-medium text-gray-400">
              黑客松 - 合作方（逗号分隔）
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
              <textarea
                value={settings.hackathon_partners || ""}
                onChange={(event) => handleChange("hackathon_partners", event.target.value)}
                placeholder="Minimax，阿里云，魔搭，阶跃星辰"
                rows={2}
                className="theme-admin-input flex-1 rounded-xl p-3"
              />
              {fieldAction("hackathon_partners")}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              多个合作方使用英文逗号分隔，将同时显示在合作方和 AI 生态团队区域。
            </p>
          </div>
        </div>
      </AdminPanel>
    </AdminPageShell>
  );
};

export default SettingsManager;
