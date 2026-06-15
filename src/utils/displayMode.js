export const isStandaloneDisplay = () => {
  if (typeof window === "undefined") return false;

  const isStandaloneMedia =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  const isFullscreenMedia =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: fullscreen)").matches;
  const isIosStandalone = window.navigator?.standalone === true;
  const isTrustedWebActivity = document.referrer?.startsWith("android-app://");

  return Boolean(
    isStandaloneMedia ||
      isFullscreenMedia ||
      isIosStandalone ||
      isTrustedWebActivity,
  );
};
