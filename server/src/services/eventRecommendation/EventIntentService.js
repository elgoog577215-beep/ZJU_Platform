const createEventIntentService = ({
  parseAssistantIntent,
  parseAssistantIntentWithModel,
}) => ({
  parseLocal(options) {
    return parseAssistantIntent(options);
  },

  async parseWithModel(options) {
    return parseAssistantIntentWithModel(options);
  },
});

module.exports = {
  createEventIntentService,
};
