const { callChatCompletionWithFailover } = require('./aiModelConfigService');

const DEFAULT_JSON_TIMEOUT_MS = 45000;

const toText = (value, maxLength = 4000) => {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

const getChatMessageText = (data) => {
  const choice = data?.choices?.[0] || {};
  const message = choice.message || choice.delta || {};
  return message.content || message.reasoning_content || choice.text || '';
};

const extractJsonObject = (content) => {
  if (typeof content !== 'string' || content.trim() === '') {
    const error = new Error('Model returned empty content.');
    error.code = 'AI_RUNTIME_EMPTY_CONTENT';
    error.statusCode = 502;
    throw error;
  }

  const fencedMatch = content.match(/```json\s*([\s\S]*?)\s*```/i)
    || content.match(/```\s*([\s\S]*?)\s*```/i);
  if (fencedMatch) return fencedMatch[1].trim();

  const objectStart = content.indexOf('{');
  const objectEnd = content.lastIndexOf('}');
  if (objectStart >= 0 && objectEnd > objectStart) {
    return content.slice(objectStart, objectEnd + 1).trim();
  }

  const arrayStart = content.indexOf('[');
  const arrayEnd = content.lastIndexOf(']');
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    return content.slice(arrayStart, arrayEnd + 1).trim();
  }

  return content.trim();
};

const parseJsonFromText = (content) => {
  const jsonText = extractJsonObject(content);
  try {
    return {
      parsed: JSON.parse(jsonText),
      jsonText
    };
  } catch (error) {
    const nextError = new Error('Model returned invalid JSON.');
    nextError.code = 'AI_RUNTIME_INVALID_JSON';
    nextError.statusCode = 502;
    nextError.rawContent = content;
    nextError.extractedJson = jsonText;
    throw nextError;
  }
};

const normalizeRunnerOutput = (output) => {
  if (output && typeof output === 'object' && !Array.isArray(output) && output.parsed !== undefined) {
    return {
      parsed: output.parsed,
      rawContent: typeof output.rawContent === 'string'
        ? output.rawContent
        : JSON.stringify(output.parsed),
      jsonText: typeof output.jsonText === 'string'
        ? output.jsonText
        : JSON.stringify(output.parsed)
    };
  }

  if (output && typeof output === 'object' && !Array.isArray(output)) {
    return {
      parsed: output,
      rawContent: JSON.stringify(output),
      jsonText: JSON.stringify(output)
    };
  }

  const rawContent = typeof output === 'string' ? output : JSON.stringify(output);
  const { parsed, jsonText } = parseJsonFromText(rawContent);
  return { parsed, rawContent, jsonText };
};

const callJson = async (db, {
  task,
  messages,
  temperature = 0.2,
  maxTokens = 1200,
  timeout = DEFAULT_JSON_TIMEOUT_MS,
  modelRunner
}) => {
  if (!Array.isArray(messages) || messages.length === 0) {
    const error = new Error('AI runtime requires messages.');
    error.code = 'AI_RUNTIME_MESSAGES_REQUIRED';
    error.statusCode = 400;
    throw error;
  }

  if (modelRunner) {
    const normalized = normalizeRunnerOutput(await modelRunner({
      task,
      messages,
      temperature,
      maxTokens
    }));
    return {
      ...normalized,
      config: { id: 'injected', name: 'Injected model runner' },
      attempts: [],
      modelStatus: {
        used: true,
        task,
        provider: 'injected',
        fallbackAttempts: []
      }
    };
  }

  if (!db) {
    const error = new Error('AI runtime requires a database connection.');
    error.code = 'AI_RUNTIME_DB_REQUIRED';
    error.statusCode = 503;
    throw error;
  }

  const result = await callChatCompletionWithFailover(
    db,
    {
      messages,
      temperature,
      max_tokens: maxTokens
    },
    { timeout }
  );

  const rawContent = getChatMessageText(result.data);
  const { parsed, jsonText } = parseJsonFromText(rawContent);

  return {
    parsed,
    rawContent,
    jsonText,
    config: result.config,
    attempts: result.attempts || [],
    modelStatus: {
      used: true,
      task,
      provider: result.config?.name || result.config?.provider || null,
      model: result.config?.model || null,
      fallbackAttempts: result.attempts || []
    }
  };
};

module.exports = {
  callJson,
  extractJsonObject,
  getChatMessageText,
  parseJsonFromText,
  toText
};
