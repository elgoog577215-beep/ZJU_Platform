const { createEventIntentService } = require('./EventIntentService');
const { createEventRetrievalService } = require('./EventRetrievalService');
const { createEventRankingService } = require('./EventRankingService');
const { createEventProfileService } = require('./EventProfileService');
const { createEventExplanationService } = require('./EventExplanationService');
const { createEventAssistantTelemetryService } = require('./EventAssistantTelemetryService');
const { createEventAssistantResponseBuilder } = require('./EventAssistantResponseBuilder');

const createEventRecommendationServices = (dependencies) => ({
  intent: createEventIntentService(dependencies),
  retrieval: createEventRetrievalService(dependencies),
  ranking: createEventRankingService(dependencies),
  profile: createEventProfileService(dependencies),
  explanation: createEventExplanationService(dependencies),
  telemetry: createEventAssistantTelemetryService(dependencies),
  response: createEventAssistantResponseBuilder(dependencies),
});

module.exports = {
  createEventRecommendationServices,
};
