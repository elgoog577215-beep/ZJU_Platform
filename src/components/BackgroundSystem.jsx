import React from "react";
import { useSettings } from "../context/SettingsContext";

const backgroundStyles = {
  day: {
    base: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 48%, #f8fafc 100%)",
    glow:
      "radial-gradient(circle at top, rgba(99,102,241,0.16), transparent 44%)",
    orb: "rgba(129,140,248,0.18)",
    overlay:
      "radial-gradient(circle at center, transparent 0%, rgba(255,255,255,0.06) 68%, rgba(248,250,252,0.14) 100%)",
  },
  dark: {
    base: "linear-gradient(180deg, #020617 0%, #000000 100%)",
    glow:
      "radial-gradient(circle at top, rgba(59,130,246,0.14), transparent 42%)",
    orb: "rgba(56,189,248,0.14)",
    overlay:
      "radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.42) 72%, rgba(0,0,0,0.72) 100%)",
  },
};

const BackgroundSystem = () => {
  const { settings, uiMode } = useSettings();
  const themeMode = uiMode === "day" ? "day" : "dark";
  const backgroundStyle = backgroundStyles[themeMode];
  const rawBrightness = Number.parseFloat(settings.background_brightness || 1);
  const brightness =
    themeMode === "day" ? Math.min(rawBrightness, 1.02) : rawBrightness;

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden ${themeMode === "day" ? "bg-[#f8fafc]" : "bg-black"}`}
      style={{ filter: `brightness(${brightness})` }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `${backgroundStyle.glow}, ${backgroundStyle.base}`,
        }}
      />
      <div
        className="absolute left-1/2 top-0 h-[40vw] w-[40vw] min-h-[280px] min-w-[280px] -translate-x-1/2 rounded-full blur-3xl"
        style={{ backgroundColor: backgroundStyle.orb }}
      />
      <div
        className="absolute inset-0"
        style={{ background: backgroundStyle.overlay }}
      />
    </div>
  );
};

export default BackgroundSystem;
