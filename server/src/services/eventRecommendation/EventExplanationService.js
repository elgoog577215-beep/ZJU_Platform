const createEventExplanationService = ({
  buildClarificationResponse,
  buildFallbackRecommendationResponse,
  buildAiRecommendationResponse,
  buildReasoningTrace,
  buildIntentSummary,
}) => ({
  buildClarification(options) {
    return buildClarificationResponse(options);
  },

  buildFallbackRecommendation(options) {
    return buildFallbackRecommendationResponse(options);
  },

  buildAiRecommendation(options) {
    return buildAiRecommendationResponse(options);
  },

  buildReasoningTrace(options) {
    return buildReasoningTrace(options);
  },

  buildIntentSummary(intent, profile) {
    return buildIntentSummary(intent, profile);
  },
});

module.exports = {
  createEventExplanationService,
};
