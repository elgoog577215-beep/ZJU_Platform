const createEventAssistantTelemetryService = ({
  recordEventAssistantRun,
  logInvalidModelOutput,
}) => ({
  recordRun(db, response, userId) {
    return recordEventAssistantRun(db, response, userId);
  },

  logInvalidModelOutput(payload) {
    return logInvalidModelOutput(payload);
  },
});

module.exports = {
  createEventAssistantTelemetryService,
};
