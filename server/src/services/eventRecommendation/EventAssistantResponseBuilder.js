const createEventAssistantResponseBuilder = ({
  buildClarificationResponse,
  buildFallbackRecommendationResponse,
  buildAiRecommendationResponse,
}) => ({
  clarification(options) {
    return buildClarificationResponse(options);
  },

  fallbackRecommendation(options) {
    return buildFallbackRecommendationResponse(options);
  },

  aiRecommendation(options) {
    return buildAiRecommendationResponse(options);
  },

  empty(options) {
    return {
      type: 'empty',
      recommendationMode: 'empty',
      ...options,
    };
  },
});

module.exports = {
  createEventAssistantResponseBuilder,
};
