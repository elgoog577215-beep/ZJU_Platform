const { callChatCompletionWithFailover } = require('./aiModelConfigService');

const DEFAULT_JSON_TIMEOUT_MS = 45000;
const MAX_RAW_RESPONSE_LOG_LENGTH = 6000;

const TASK_RUNTIME_POLICIES = {
  event_recommendation_intent: {
    temperature: 0.15,
    maxTokens: 900,
    timeout: 35000,
  },
  event_recommendation_rerank: {
    temperature: 0.2,
    maxTokens: 1400,
    timeout: 45000,
  },
  event_profile: {
    temperature: 0.1,
    maxTokens: 900,
    timeout: 45000,
  },
  hackathon_ai_coach: {
    temperature: 0.25,
    maxTokens: 1500,
    timeout: 45000,
  },
  event_governance_review: {
    temperature: 0.1,
    maxTokens: 1400,
    timeout: 35000,
  },
  json_repair: {
    temperature: 0,
    maxTokens: 1200,
    timeout: 30000,
  },
};

const resolveTaskRuntimePolicy = (task, overrides = {}) => {
  const defaults = TASK_RUNTIME_POLICIES[task] || {};
  return {
    temperature: overrides.temperature ?? defaults.temperature ?? 0.2,
    maxTokens: overrides.maxTokens ?? defaults.maxTokens ?? 1200,
    timeout: overrides.timeout ?? defaults.timeout ?? DEFAULT_JSON_TIMEOUT_MS,
  };
};

const toText = (value, maxLength = 4000) => {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

const QUALITY_INSTRUCTION = [
  'Quality requirements for every AI assistant task:',
  '- Ground every claim in the provided context; say uncertainty through confidence, warnings, or conservative output fields.',
  '- Do not invent events, dates, locations, rewards, policies, categories, links, or IDs.',
  '- Prefer structured, concise, user-useful outputs with concrete reasons and next actions.',
  '- Use only allowed standard values when the payload provides allowed categories, audiences, candidates, or source IDs.',
  '- Return valid JSON only. No markdown, no private reasoning transcript, no raw prompt echo.',
].join('\n');

const attachQualityInstruction = (messages = []) => {
  if (!Array.isArray(messages) || messages.length === 0) return messages;
  const firstSystemIndex = messages.findIndex((message) => message?.role === 'system');
  if (firstSystemIndex < 0) {
    return [
      { role: 'system', content: QUALITY_INSTRUCTION },
      ...messages,
    ];
  }

  return messages.map((message, index) => {
    if (index !== firstSystemIndex) return message;
    return {
      ...message,
      content: [
        contentToText(message.content),
        QUALITY_INSTRUCTION,
      ].filter(Boolean).join('\n\n'),
    };
  });
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

const estimateTextTokens = (value) => {
  const text = toText(value, 20000);
  if (!text) return 0;
  const weighted = Array.from(text).reduce((sum, char) => {
    if (/[\u4e00-\u9fff]/.test(char)) return sum + 1;
    if (/\s/.test(char)) return sum + 0.05;
    return sum + 0.28;
  }, 0);
  return Math.max(1, Math.ceil(weighted));
};

const estimateMessagesTokens = (messages) => {
  if (!Array.isArray(messages)) return 0;
  return messages.reduce((sum, message) => (
    sum
    + estimateTextTokens(message?.role || '')
    + estimateTextTokens(contentToText(message?.content))
  ), 0);
};

const readUsage = (data = {}) => {
  const usage = data?.usage || {};
  const promptTokens = Number(
    usage.prompt_tokens
    ?? usage.promptTokens
    ?? usage.input_tokens
    ?? usage.inputTokens
    ?? 0
  ) || 0;
  const completionTokens = Number(
    usage.completion_tokens
    ?? usage.completionTokens
    ?? usage.output_tokens
    ?? usage.outputTokens
    ?? 0
  ) || 0;
  const totalTokens = Number(
    usage.total_tokens
    ?? usage.totalTokens
    ?? 0
  ) || (promptTokens + completionTokens);

  return {
    promptTokens,
    completionTokens,
    totalTokens,
  };
};

const buildRuntimeTelemetry = ({
  task,
  messages,
  runtimePolicy,
  startedAt,
  responseData,
  attempts = [],
}) => {
  const promptTokensEstimate = estimateMessagesTokens(messages);
  const maxCompletionTokens = Number(runtimePolicy?.maxTokens || 0);
  const usage = readUsage(responseData);
  const normalizedAttempts = Array.isArray(attempts) ? attempts : [];

  return {
    task,
    durationMs: Math.max(0, Date.now() - startedAt),
    promptTokensEstimate,
    maxCompletionTokens,
    budgetTokensEstimate: promptTokensEstimate + maxCompletionTokens,
    reportedPromptTokens: usage.promptTokens,
    reportedCompletionTokens: usage.completionTokens,
    reportedTotalTokens: usage.totalTokens,
    attemptCount: normalizedAttempts.length + 1,
    retryCount: normalizedAttempts.length,
    usedStreamRetry: normalizedAttempts.some((attempt) => attempt?.status === 'stream_retry'),
    usedJsonRepair: normalizedAttempts.some((attempt) => attempt?.status === 'json_repair'),
  };
};

const collectModelTelemetries = (statusLike, output = []) => {
  if (!statusLike) return output;
  if (Array.isArray(statusLike)) {
    for (const item of statusLike) collectModelTelemetries(item, output);
    return output;
  }
  if (typeof statusLike !== 'object') return output;
  if (statusLike.telemetry && typeof statusLike.telemetry === 'object') {
    output.push(statusLike.telemetry);
  }
  collectModelTelemetries(statusLike.profileModelStatuses, output);
  collectModelTelemetries(statusLike.modelStatuses, output);
  return output;
};

const summarizeModelStatusTelemetry = (statusLike) => {
  const telemetries = collectModelTelemetries(statusLike);
  const taskMap = new Map();
  const summary = {
    taskCount: telemetries.length,
    tasks: [],
    totalDurationMs: 0,
    avgDurationMs: 0,
    totalPromptTokensEstimate: 0,
    totalMaxCompletionTokens: 0,
    totalBudgetTokensEstimate: 0,
    reportedPromptTokens: 0,
    reportedCompletionTokens: 0,
    reportedTotalTokens: 0,
    retryCount: 0,
    taskStats: [],
  };

  for (const telemetry of telemetries) {
    const task = telemetry.task || 'unknown';
    const durationMs = Number(telemetry.durationMs || 0);
    const promptTokensEstimate = Number(telemetry.promptTokensEstimate || 0);
    const maxCompletionTokens = Number(telemetry.maxCompletionTokens || 0);
    const budgetTokensEstimate = Number(telemetry.budgetTokensEstimate || 0);
    const reportedPromptTokens = Number(telemetry.reportedPromptTokens || 0);
    const reportedCompletionTokens = Number(telemetry.reportedCompletionTokens || 0);
    const reportedTotalTokens = Number(telemetry.reportedTotalTokens || 0);
    const retryCount = Number(telemetry.retryCount || 0);

    summary.totalDurationMs += durationMs;
    summary.totalPromptTokensEstimate += promptTokensEstimate;
    summary.totalMaxCompletionTokens += maxCompletionTokens;
    summary.totalBudgetTokensEstimate += budgetTokensEstimate;
    summary.reportedPromptTokens += reportedPromptTokens;
    summary.reportedCompletionTokens += reportedCompletionTokens;
    summary.reportedTotalTokens += reportedTotalTokens;
    summary.retryCount += retryCount;

    const taskStats = taskMap.get(task) || {
      task,
      count: 0,
      durationMs: 0,
      promptTokensEstimate: 0,
      maxCompletionTokens: 0,
      budgetTokensEstimate: 0,
      reportedTotalTokens: 0,
      retryCount: 0,
    };
    taskStats.count += 1;
    taskStats.durationMs += durationMs;
    taskStats.promptTokensEstimate += promptTokensEstimate;
    taskStats.maxCompletionTokens += maxCompletionTokens;
    taskStats.budgetTokensEstimate += budgetTokensEstimate;
    taskStats.reportedTotalTokens += reportedTotalTokens;
    taskStats.retryCount += retryCount;
    taskMap.set(task, taskStats);
  }

  summary.avgDurationMs = summary.taskCount > 0
    ? Math.round(summary.totalDurationMs / summary.taskCount)
    : 0;
  summary.tasks = [...taskMap.keys()].slice(0, 12);
  summary.taskStats = [...taskMap.values()]
    .sort((left, right) => right.durationMs - left.durationMs || left.task.localeCompare(right.task))
    .slice(0, 12);

  return summary;
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
  temperature,
  maxTokens,
  timeout,
  modelRunner
}) => {
  if (!Array.isArray(messages) || messages.length === 0) {
    const error = new Error('AI runtime requires messages.');
    error.code = 'AI_RUNTIME_MESSAGES_REQUIRED';
    error.statusCode = 400;
    throw error;
  }

  const qualityMessages = attachQualityInstruction(messages);
  const runtimePolicy = resolveTaskRuntimePolicy(task, { temperature, maxTokens, timeout });

  if (modelRunner) {
    const startedAt = Date.now();
    const runnerOutput = await modelRunner({
      task,
      messages: qualityMessages,
      temperature: runtimePolicy.temperature,
      maxTokens: runtimePolicy.maxTokens,
      timeout: runtimePolicy.timeout,
      runtimePolicy
    });
    const normalized = normalizeRunnerOutput(runnerOutput);
    return {
      ...normalized,
      config: { id: 'injected', name: 'Injected model runner' },
      attempts: [],
      modelStatus: {
        used: true,
        task,
        provider: 'injected',
        runtimePolicy,
        fallbackAttempts: [],
        telemetry: buildRuntimeTelemetry({
          task,
          messages: qualityMessages,
          runtimePolicy,
          startedAt,
          responseData: runnerOutput?.data || { usage: runnerOutput?.usage || null },
          attempts: [],
        }),
      }
    };
  }

  if (!db) {
    const error = new Error('AI runtime requires a database connection.');
    error.code = 'AI_RUNTIME_DB_REQUIRED';
    error.statusCode = 503;
    throw error;
  }

  const startedAt = Date.now();
  const result = await callChatCompletionWithFailover(
    db,
    {
      messages: qualityMessages,
      temperature: runtimePolicy.temperature,
      max_tokens: runtimePolicy.maxTokens
    },
    { timeout: runtimePolicy.timeout }
  );
  let responseData = result.data;

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
            messages: qualityMessages,
            temperature: runtimePolicy.temperature,
            max_tokens: runtimePolicy.maxTokens
          },
          {
            timeout: Math.min(runtimePolicy.timeout, 30000),
            stream: true
          }
        );
        normalized = parseJsonFromModelResult(streamResult);
        responseData = streamResult.data;
        result.data = streamResult.data;
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
          runtimePolicy,
          fallbackAttempts: result.attempts || [],
          telemetry: buildRuntimeTelemetry({
            task,
            messages: qualityMessages,
            runtimePolicy,
            startedAt,
            responseData,
            attempts: result.attempts || [],
          }),
        }
      };
    }

    const repairMessages = attachQualityInstruction([
      {
        role: 'system',
        content: 'Return one valid JSON object only. No markdown, no explanations.'
      },
      {
        role: 'user',
        content: JSON.stringify({
          task,
          instruction: 'Regenerate the requested result as strict JSON only.',
          original_messages: qualityMessages.map((message) => ({
            role: message.role,
            content: toText(message.content, 1800)
          }))
        }, null, 2)
      }
    ]);

    const repair = await callChatCompletionWithFailover(
      db,
      {
        messages: repairMessages,
        temperature: 0,
        max_tokens: Math.min(Math.max(runtimePolicy.maxTokens, 400), 1200)
      },
      { timeout: Math.min(runtimePolicy.timeout, 30000) }
    );

    try {
      normalized = parseJsonFromModelResult(repair);
      responseData = repair.data;
      result.data = repair.data;
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
      runtimePolicy,
      fallbackAttempts: result.attempts || [],
      telemetry: buildRuntimeTelemetry({
        task,
        messages: qualityMessages,
        runtimePolicy,
        startedAt,
        responseData,
        attempts: result.attempts || [],
      }),
    }
  };
};

module.exports = {
  TASK_RUNTIME_POLICIES,
  callJson,
  extractJsonObject,
  getChatMessageText,
  parseJsonFromText,
  resolveTaskRuntimePolicy,
  summarizeModelStatusTelemetry,
  toText
};
