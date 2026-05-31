export const getOrCreateSiteVisitorKey = () => {
  if (typeof window === "undefined") return null;

  let visitorKey = window.localStorage.getItem("site-visitor-key");
  if (!visitorKey) {
    visitorKey =
      window.crypto?.randomUUID?.() ||
      `visitor-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem("site-visitor-key", visitorKey);
  }

  return visitorKey;
};
