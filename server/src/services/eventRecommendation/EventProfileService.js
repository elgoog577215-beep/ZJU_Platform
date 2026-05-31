const createEventProfileService = ({
  loadUserEventProfile,
  maybeRememberPreference,
  buildProfileSummary,
}) => ({
  load(db, userId, visitorKey = '') {
    return loadUserEventProfile(db, userId, visitorKey);
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
