const createEventRetrievalService = ({
  loadAllCandidates,
  loadScopedCandidates,
  buildCoverageSummary,
  buildAiCandidatePool,
}) => ({
  loadAll(db, now) {
    return loadAllCandidates(db, now);
  },

  loadScoped(db, scope, now) {
    return loadScopedCandidates(db, scope, now);
  },

  summarizeCoverage(grouped) {
    return buildCoverageSummary(grouped);
  },

  buildCandidatePool(options) {
    return buildAiCandidatePool(options);
  },
});

module.exports = {
  createEventRetrievalService,
};
