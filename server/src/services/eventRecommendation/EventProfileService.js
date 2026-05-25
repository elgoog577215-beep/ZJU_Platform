const createEventProfileService = ({
  loadUserEventProfile,
  maybeRememberPreference,
  buildProfileSummary,
}) => ({
  load(db, userId) {
    return loadUserEventProfile(db, userId);
  },

  rememberPreference(db, userId, intent, rememberPreference) {
    return maybeRememberPreference(db, userId, intent, rememberPreference);
  },

  summarize(profile) {
    return buildProfileSummary(profile);
  },
});

module.exports = {
  createEventProfileService,
};
