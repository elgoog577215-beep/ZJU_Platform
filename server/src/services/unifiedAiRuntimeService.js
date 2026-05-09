const { callChatCompletionWithFailover } = require('./aiModelConfigService');

const DEFAULT_JSON_TIMEOUT_MS = 45000;
const MAX_RAW_RESPONSE_LOG_LENGTH = 6000;

const toText = (value, maxLength = 4000) => {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

const contentToText = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item;
        return item?.text || item?.content || item?.value || '';
      })
      .join('');
  }
  if (typeof value === 'object') {
    return value.text || value.content || value.value || '';
  }
  return String(value);
};

const getChatMessageText = (data) => {
  const choice = data?.choices?.[0] || {};
  const message = choice.message || choice.delta || {};
  return [
    contentToText(message.content),
    contentToText(message.reasoning_content),
    contentToText(choice.text),
    contentToText(data?.output_text),
    contentToText(data?.content),
  ].find((item) => item && item.trim()) || '';
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

const attachModelDebug = (error, result) => {
  error.attempts = result?.attempts || error.attempts || [];
  error.config = result?.config || error.config || null;
  if (!error.rawContent) {
    error.rawContent = toText(JSON.stringify(result?.data || {}), MAX_RAW_RESPONSE_LOG_LENGTH);
  }
  return error;
};

const parseJsonFromModelResult = (result) => {
  const rawContent = getChatMessageText(result.data);
  try {
    const { parsed, jsonText } = parseJsonFromText(rawContent);
    return {
      parsed,
      jsonText,
      rawContent
    };
  } catch (error) {
    throw attachModelDebug(error, result);
  }
};

const mergeAttemptLists = (...lists) => lists
  .flat()
  .filter(Boolean);

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

  let normalized;
  try {
    normalized = parseJsonFromModelResult(result);
  } catch (error) {
    if (!['AI_RUNTIME_EMPTY_CONTENT', 'AI_RUNTIME_INVALID_JSON'].includes(error.code)) {
      throw error;
    }

    if (error.code === 'AI_RUNTIME_EMPTY_CONTENT') {
      try {
        const streamResult = await callChatCompletionWithFailover(
          db,
          {
            messages,
            temperature,
            max_tokens: maxTokens
          },
          {
            timeout: Math.min(timeout, 30000),
            stream: true
          }
        );
        normalized = parseJsonFromModelResult(streamResult);
        result.attempts = mergeAttemptLists(
          result.attempts,
          {
            id: result.config?.id,
            name: result.config?.name,
            status: 'stream_retry',
            message: error.code
          },
          streamResult.attempts
        );
        result.config = streamResult.config || result.config;
      } catch (streamError) {
        error.attempts = mergeAttemptLists(
          error.attempts,
          {
            id: result.config?.id,
            name: result.config?.name,
            status: 'stream_retry_failed',
            message: streamError.code || streamError.message
          },
          streamError.attempts
        );
      }
    }

    if (normalized) {
      return {
        parsed: normalized.parsed,
        rawContent: normalized.rawContent,
        jsonText: normalized.jsonText,
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
    }

    const repair = await callChatCompletionWithFailover(
      db,
      {
        messages: [
          {
            role: 'system',
            content: 'Return one valid JSON object only. No markdown, no explanations.'
          },
          {
            role: 'user',
            content: JSON.stringify({
              task,
              instruction: 'Regenerate the requested result as strict JSON only.',
              original_messages: messages.map((message) => ({
                role: message.role,
                content: toText(message.content, 1800)
              }))
            }, null, 2)
          }
        ],
        temperature: 0,
        max_tokens: Math.min(Math.max(maxTokens, 400), 1200)
      },
      { timeout: Math.min(timeout, 30000) }
    );

    try {
      normalized = parseJsonFromModelResult(repair);
      result.attempts = mergeAttemptLists(
        result.attempts,
        {
          id: result.config?.id,
          name: result.config?.name,
          status: 'json_repair',
          message: error.code
        },
        repair.attempts
      );
      result.config = repair.config || result.config;
    } catch (repairError) {
      repairError.attempts = mergeAttemptLists(
        error.attempts,
        {
          id: result.config?.id,
          name: result.config?.name,
          status: 'json_repair_failed',
          message: repairError.code || repairError.message
        },
        repairError.attempts
      );
      throw repairError;
    }
  }

  return {
    parsed: normalized.parsed,
    rawContent: normalized.rawContent,
    jsonText: normalized.jsonText,
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
