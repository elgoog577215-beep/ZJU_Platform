const {
  MATURITY_DIMENSIONS,
  buildAgentSpecMarkdown,
  getAgentDefinitions,
  getAgentSystemOverview,
  validateAgentRegistry,
} = require('../src/services/aiAgentRegistryService');

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const requiredAgents = [
  'event_recommendation',
  'hackathon_coach',
  'wechat_event_parser',
  'event_governance',
  'model_config_runtime',
  'event_profile_index',
];

const main = () => {
  const validation = validateAgentRegistry();
  assert(validation.ok, validation.errors.join('\n'));

  const agents = getAgentDefinitions();
  const ids = new Set(agents.map((agent) => agent.id));
  for (const id of requiredAgents) {
    assert(ids.has(id), `Expected required agent in registry: ${id}`);
  }

  for (const agent of agents) {
    assert(agent.reasoningChain.length >= 4, `${agent.id} needs an explicit logic chain.`);
    assert(agent.outputContracts.length >= 1, `${agent.id} needs at least one output contract.`);
    assert(agent.validation.length >= 1, `${agent.id} needs validation guardrails.`);
    assert(agent.fallback.length >= 1, `${agent.id} needs fallback recovery.`);
    assert(agent.evaluation.length >= 1, `${agent.id} needs repeatable checks.`);
    assert(agent.maturityScore.score >= 0.55, `${agent.id} maturity is too low for production tracking.`);
  }

  const eventAgent = agents.find((agent) => agent.id === 'event_recommendation');
  assert(
    eventAgent.promptTemplates.some((template) => template.id === 'event_recommendation_rerank'),
    'Event recommendation agent must declare the rerank prompt template.'
  );
  assert(
    eventAgent.contextIndexes.includes('event_ai_profiles'),
    'Event recommendation agent must use the event profile index.'
  );

  const hackathonAgent = agents.find((agent) => agent.id === 'hackathon_coach');
  assert(
    hackathonAgent.promptTemplates.some((template) => template.id === 'hackathon_ai_coach'),
    'Hackathon coach must declare its model prompt template.'
  );

  const overview = getAgentSystemOverview({
    eventCount: 10,
    uncategorizedEventCount: 2,
    enabledModelConfigCount: 1,
    healthyModelConfigCount: 1,
    eventAiProfileCount: 8,
    readyEventAiProfileCount: 7,
    eventAiProfileCoverageRatio: 0.8,
    runtimeTelemetryTaskCount: 4,
    runtimeTelemetryAvgDurationMs: 123,
    runtimeTelemetryRetryCount: 1,
  });
  assert(overview.summary.agentCount === requiredAgents.length, 'Overview should expose all registered agents.');
  assert(overview.summary.averageMaturity > 0.7, 'Average agent maturity should stay above the first rollout floor.');
  assert(overview.modules.some((module) => module.id === 'model_config_runtime'), 'Overview should include runtime module.');
  assert(overview.summary.highPriorityGapCount === 0, 'High-priority maturity gaps should be cleared.');
  assert(overview.summary.partialGapCount > 0, 'Partial maturity gaps should remain visible for polishing.');
  assert(
    !overview.partialGaps.some((gap) => (
      gap.agentId === 'event_profile_index'
      && gap.dimensionId === 'observability'
    )),
    'Event profile index observability should be complete after exposing stale and missing profile signals.'
  );
  assert(
    !overview.partialGaps.some((gap) => (
      gap.agentId === 'model_config_runtime'
      && gap.dimensionId === 'observability'
    )),
    'Model runtime observability should be complete after exposing per-task runtime telemetry.'
  );
  const runtimeModule = overview.modules.find((module) => module.id === 'model_config_runtime');
  assert(
    runtimeModule.metrics.some((metric) => metric.label === 'AI tasks' && metric.value === 4),
    'Runtime module metrics should expose recent AI task telemetry.'
  );
  assert(overview.continuousImprovementPlan.length > 0, 'Overview should expose partial-gap improvement plan.');
  assert(
    overview.modules.some((module) => module.nextImprovements.length > 0),
    'Overview should still expose continuous improvement suggestions.'
  );

  const spec = buildAgentSpecMarkdown();
  for (const id of requiredAgents) {
    assert(spec.includes(id), `Generated spec should mention ${id}.`);
  }
  for (const dimension of MATURITY_DIMENSIONS) {
    assert(spec.includes(dimension.label), `Generated spec should mention dimension ${dimension.label}.`);
  }

  console.log(JSON.stringify({
    ok: true,
    agentCount: agents.length,
    dimensionCount: MATURITY_DIMENSIONS.length,
    averageMaturity: Number(overview.summary.averageMaturity.toFixed(3)),
    highPriorityGapCount: overview.summary.highPriorityGapCount,
  }, null, 2));
};

try {
  main();
} catch (error) {
  console.error('AI agent registry check failed:', error.message);
  process.exitCode = 1;
}
