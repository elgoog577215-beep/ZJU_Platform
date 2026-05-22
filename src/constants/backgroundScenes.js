export const DEFAULT_BACKGROUND_SCENE = "cyber";

export const BACKGROUND_SCENES = [
  {
    id: "cyber",
    name: "赛博电路",
    desc: "2 月版蓝色移动网格，线条更亮，速度更直接。",
    preview:
      "bg-[radial-gradient(circle_at_50%_76%,rgba(0,255,255,0.48),transparent_40%),linear-gradient(135deg,#000000,#001b20_58%,#000000)]",
  },
  {
    id: "space",
    name: "深空星云",
    desc: "高密度星野叠加紫蓝星云，保留旧版的空间感。",
    preview:
      "bg-[radial-gradient(circle_at_28%_24%,rgba(76,29,149,0.7),transparent_36%),radial-gradient(circle_at_78%_34%,rgba(30,64,175,0.58),transparent_38%),linear-gradient(135deg,#00000a,#040012)]",
  },
  {
    id: "grid",
    name: "复古网格",
    desc: "合成器风格地平线网格，粉紫线条更醒目。",
    preview:
      "bg-[radial-gradient(circle_at_52%_78%,rgba(255,0,255,0.58),transparent_38%),linear-gradient(135deg,#000000,#160020_62%,#020004)]",
  },
  {
    id: "embers",
    name: "余烬流光",
    desc: "橙金粒子从底部升起，亮度和粒子密度接近旧版。",
    preview:
      "bg-[radial-gradient(circle_at_50%_82%,rgba(255,170,0,0.78),transparent_40%),linear-gradient(135deg,#080100,#1a0500_58%,#000000)]",
  },
  {
    id: "crystal",
    name: "晶体洞窟",
    desc: "青、品红、黄色线框晶体漂浮，视觉焦点更清晰。",
    preview:
      "bg-[radial-gradient(circle_at_35%_24%,rgba(0,255,255,0.58),transparent_34%),radial-gradient(circle_at_74%_72%,rgba(255,0,255,0.5),transparent_34%),linear-gradient(135deg,#000910,#050012)]",
  },
  {
    id: "clouds",
    name: "空灵云层",
    desc: "从旧版浅蓝云层迁移而来，改为夜间可读的冷雾星空。",
    preview:
      "bg-[radial-gradient(circle_at_50%_38%,rgba(223,247,255,0.34),transparent_44%),radial-gradient(circle_at_34%_58%,rgba(96,165,250,0.26),transparent_40%),linear-gradient(135deg,#071426,#123154_62%,#020617)]",
  },
  {
    id: "dna",
    name: "数字 DNA",
    desc: "绿色双螺旋粒子缓慢旋转，科技感更强。",
    preview:
      "bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,136,0.54),transparent_36%),linear-gradient(135deg,#000804,#00120a_58%,#000000)]",
  },
  {
    id: "binary",
    name: "二进制流",
    desc: "高速绿色数据粒子穿行，适合更强烈的动态氛围。",
    preview:
      "bg-[radial-gradient(circle_at_50%_52%,rgba(0,255,0,0.48),transparent_40%),linear-gradient(135deg,#000900,#001600_58%,#000000)]",
  },
  {
    id: "network",
    name: "网络节点",
    desc: "蓝色节点、连线与星点构成轻量网络结构。",
    preview:
      "bg-[radial-gradient(circle_at_52%_40%,rgba(68,136,255,0.56),transparent_38%),linear-gradient(135deg,#010715,#061a38_58%,#000000)]",
  },
  {
    id: "wave",
    name: "粒子波面",
    desc: "粉色点阵波浪起伏，回到 2 月版的振幅和密度。",
    preview:
      "bg-[radial-gradient(circle_at_56%_54%,rgba(255,0,170,0.58),transparent_38%),linear-gradient(135deg,#050014,#17001f_58%,#000000)]",
  },
  {
    id: "orbit",
    name: "轨道核心",
    desc: "发光核心和三重轨道旋转，形成明确视觉中心。",
    preview:
      "bg-[radial-gradient(circle_at_50%_50%,rgba(255,51,102,0.62),transparent_36%),linear-gradient(135deg,#080006,#1a0010_58%,#000000)]",
  },
];

export const BACKGROUND_SCENE_IDS = BACKGROUND_SCENES.map((scene) => scene.id);

export const isBackgroundSceneId = (sceneId) => BACKGROUND_SCENE_IDS.includes(sceneId);
