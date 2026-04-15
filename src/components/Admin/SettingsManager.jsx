import React, { useEffect, useMemo, useState } from "react";
import { Key, Globe, Sun, Save } from "lucide-react";
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
                className="flex-1 rounded-xl border border-white/10 bg-black/40 p-3 text-white outline-none transition-colors focus:border-indigo-500"
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
                className="flex-1 rounded-xl border border-white/10 bg-black/40 p-3 text-white outline-none transition-colors focus:border-indigo-500"
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
    </AdminPageShell>
  );
};

export default SettingsManager;
