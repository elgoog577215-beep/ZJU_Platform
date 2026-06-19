export const DEFAULT_BACKGROUND_SCENE = "crystal";

export const BACKGROUND_SCENES = [
  {
    id: "crystal",
    name: "晶体洞窟",
    desc: "青、品红、黄色线框晶体漂浮，视觉焦点更清晰。",
    preview:
      "bg-[radial-gradient(circle_at_35%_24%,rgba(0,255,255,0.58),transparent_34%),radial-gradient(circle_at_74%_72%,rgba(255,0,255,0.5),transparent_34%),linear-gradient(135deg,#000910,#050012)]",
  },
];

export const BACKGROUND_SCENE_IDS = BACKGROUND_SCENES.map((scene) => scene.id);

export const isBackgroundSceneId = (sceneId) => BACKGROUND_SCENE_IDS.includes(sceneId);
