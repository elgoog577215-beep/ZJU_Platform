const aiRuntime = require('./unifiedAiRuntimeService');

const toText = (value, maxLength = 4000) => {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const buildMessages = ({
  systemPrompt,
  payload,
  outputContract,
  userPrompt,
}) => [
  {
    role: 'system',
    content: [
      toText(systemPrompt, 6000),
      'Return one valid JSON object only. Do not include markdown.',
    ].filter(Boolean).join('\n\n'),
  },
  {
    role: 'user',
    content: JSON.stringify({
      ...(payload || {}),
      output_contract: outputContract || {},
      instruction: userPrompt || 'Reason over the provided context and return the requested JSON contract.',
    }, null, 2),
  },
];

const ensureObject = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    const error = new Error('Assistant task returned a non-object JSON result.');
    error.code = 'ASSISTANT_ORCHESTRATOR_INVALID_OBJECT';
    error.statusCode = 502;
    throw error;
  }
  return value;
};

const runStructuredTask = async (db, {
  task,
  systemPrompt,
  payload,
  outputContract,
  userPrompt,
  temperature = 0.2,
  maxTokens = 1200,
  timeout = 45000,
  modelRunner,
}) => {
  if (!task) {
    const error = new Error('Assistant task name is required.');
    error.code = 'ASSISTANT_ORCHESTRATOR_TASK_REQUIRED';
    error.statusCode = 400;
    throw error;
  }

  const result = await aiRuntime.callJson(db, {
    task,
    messages: buildMessages({
      systemPrompt,
      payload,
      outputContract,
      userPrompt,
    }),
    temperature,
    maxTokens,
    timeout,
    modelRunner,
  });

  return {
    parsed: ensureObject(result.parsed),
    rawContent: result.rawContent,
    jsonText: result.jsonText,
    modelStatus: {
      ...(result.modelStatus || {}),
      used: true,
      task,
      fallbackAttempts: asArray(result.modelStatus?.fallbackAttempts || result.attempts),
    },
    config: result.config,
    attempts: result.attempts || [],
  };
};

module.exports = {
  runStructuredTask,
  toText,
};
