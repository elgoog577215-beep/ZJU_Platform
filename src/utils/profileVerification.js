const ORG_TYPES = new Set(["club", "school", "enterprise", "organization"]);

export const getVerificationBadgeKind = (profile = {}) => {
  if (!profile || profile.type === "person") return null;
  if (profile.status === "pending_claim") return "pending";
  if (!profile.verified) return null;
  if (profile.type === "school") return "school";
  return ORG_TYPES.has(profile.type) ? "organization" : null;
};

export const getVerificationBadgeKey = (profile = {}) => {
  const kind = getVerificationBadgeKind(profile);
  return kind ? `profiles.verification.${kind}` : "";
};
