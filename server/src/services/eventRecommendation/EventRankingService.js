const createEventRankingService = ({
  scoreEvent,
  rankCandidates,
  rerankCandidatesWithModel,
  buildFallbackRerank,
}) => ({
  score(event, intent, profile, scope, now) {
    return scoreEvent(event, intent, profile, scope, now);
  },

  rank(candidates, intent, profile, scope, now) {
    return rankCandidates(candidates, intent, profile, scope, now);
  },

  rerankWithModel(options) {
    return rerankCandidatesWithModel(options);
  },

  buildFallback(candidates, intent, summary) {
    return buildFallbackRerank(candidates, intent, summary);
  },
});

module.exports = {
  createEventRankingService,
};
