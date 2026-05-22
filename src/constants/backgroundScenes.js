export const DEFAULT_BACKGROUND_SCENE = "cyber";

export const BACKGROUND_SCENES = [
  {
    id: "cyber",
    name: "赛博电路",
    desc: "蓝黑网格、微光星点和缓慢流动的电路线。",
    preview:
      "bg-[radial-gradient(circle_at_50%_8%,rgba(34,211,238,0.42),transparent_38%),linear-gradient(135deg,#020817,#061b2c_54%,#020617)]",
  },
  {
    id: "space",
    name: "深空星云",
    desc: "低亮度星野和紫蓝云雾，适合长时间浏览。",
    preview:
      "bg-[radial-gradient(circle_at_28%_24%,rgba(147,51,234,0.46),transparent_34%),radial-gradient(circle_at_78%_34%,rgba(37,99,235,0.36),transparent_36%),linear-gradient(135deg,#040412,#09021c)]",
  },
  {
    id: "grid",
    name: "复古网格",
    desc: "合成器风格地平线，动感更强。",
    preview:
      "bg-[radial-gradient(circle_at_52%_20%,rgba(236,72,153,0.42),transparent_34%),linear-gradient(135deg,#080014,#190028_58%,#020617)]",
  },
  {
    id: "embers",
    name: "余烬流光",
    desc: "橙金粒子上升，暖色但不刺眼。",
    preview:
      "bg-[radial-gradient(circle_at_50%_78%,rgba(249,115,22,0.62),transparent_38%),linear-gradient(135deg,#130602,#020617)]",
  },
  {
    id: "crystal",
    name: "晶体洞穴",
    desc: "冷色线框晶体漂浮，科技感更锐利。",
    preview:
      "bg-[radial-gradient(circle_at_35%_24%,rgba(34,211,238,0.42),transparent_34%),radial-gradient(circle_at_74%_72%,rgba(217,70,239,0.38),transparent_34%),linear-gradient(135deg,#02111c,#09051a)]",
  },
  {
    id: "wave",
    name: "粒子波面",
    desc: "点阵波浪轻微起伏，适合信息密集页面。",
    preview:
      "bg-[radial-gradient(circle_at_56%_54%,rgba(236,72,153,0.44),transparent_36%),linear-gradient(135deg,#07031a,#14051c_58%,#020617)]",
  },
  {
    id: "orbit",
    name: "轨道核心",
    desc: "原子轨道缓慢旋转，视觉焦点更明确。",
    preview:
      "bg-[radial-gradient(circle_at_50%_50%,rgba(244,63,94,0.58),transparent_34%),linear-gradient(135deg,#12020a,#020617)]",
  },
];

export const BACKGROUND_SCENE_IDS = BACKGROUND_SCENES.map((scene) => scene.id);

export const isBackgroundSceneId = (sceneId) => BACKGROUND_SCENE_IDS.includes(sceneId);
