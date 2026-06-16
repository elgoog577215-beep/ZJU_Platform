export const isTrustedWebActivity = () => {
  if (typeof document === "undefined") return false;
  return document.referrer?.startsWith("android-app://");
};

export const isAndroidWebView = () => {
  if (typeof navigator === "undefined") return false;
  const userAgent = navigator.userAgent || "";
  return /TuotuZjuApp\/\d+|; wv\)|\bwv\b/i.test(userAgent);
};

export const isNativeCapacitor = () => {
  if (typeof window === "undefined") return false;
  return window.Capacitor?.isNativePlatform?.() === true;
};

export const isStandaloneDisplay = () => {
  if (typeof window === "undefined") return false;

  const isStandaloneMedia =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  const isFullscreenMedia =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: fullscreen)").matches;
  const isIosStandalone = window.navigator?.standalone === true;

  return Boolean(
    isStandaloneMedia ||
      isFullscreenMedia ||
      isIosStandalone ||
      isTrustedWebActivity() ||
      isNativeCapacitor(),
  );
};

export const isAppRuntime = () => isStandaloneDisplay() || isAndroidWebView();
