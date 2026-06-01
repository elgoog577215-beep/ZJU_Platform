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
  'global_ai_search',
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
    assert(
      Array.isArray(agent.qualityProfile) && agent.qualityProfile.length === MATURITY_DIMENSIONS.length,
      `${agent.id} needs a complete quality profile.`
    );
    assert(
      Array.isArray(agent.relatedAgents) && agent.relatedAgents.length >= 1,
      `${agent.id} needs explicit related agent context.`
    );
    for (const dimension of agent.qualityProfile) {
      assert(dimension.id, `${agent.id} quality profile dimension is missing id.`);
      assert(dimension.status, `${agent.id} quality profile ${dimension.id} is missing status.`);
      assert(dimension.nextStep, `${agent.id} quality profile ${dimension.id} is missing nextStep.`);
    }
    assert(agent.maturityScore.score >= 0.55, `${agent.id} maturity is too low for production tracking.`);
  }

  const agentIds = new Set(agents.map((agent) => agent.id));
  for (const agent of agents) {
    for (const relatedAgent of agent.relatedAgents) {
      assert(
        agentIds.has(relatedAgent.id),
        `${agent.id} references unknown related agent ${relatedAgent.id}.`
      );
      assert(
        relatedAgent.id !== agent.id,
        `${agent.id} must not reference itself as a related agent.`
      );
      assert(
        relatedAgent.relationship && relatedAgent.reason,
        `${agent.id} related agent ${relatedAgent.id} needs relationship and reason.`
      );
    }
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
  assert(
    eventAgent.contextIndexes.some((item) => String(item).includes('favorites') || String(item).includes('event_registrations')),
    'Event recommendation agent must declare post-recommendation action evidence sources.'
  );
  assert(
    eventAgent.observability.some((item) => String(item).includes('action evidence')),
    'Event recommendation agent must expose recommendation action evidence observability.'
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
    modelHealth: {
      status: 'watch',
      enabledCount: 1,
      healthyCount: 1,
      errorCount: 0,
      retryCount: 1,
      circuitBreakerRecommendation: {
        status: 'watch',
        automaticAction: false,
        suggestedAction: 'Watch retry and latency trend before changing provider priority.',
      },
    },
    agentRuntimeHealth: {
      event_recommendation: {
        status: 'degraded',
        sampleSize: 4,
        runCount: 4,
        modelUsedRate: 0.75,
        fallbackRate: 0.5,
        errorCount: 1,
        warningCount: 2,
        avgDurationMs: 6800,
        retryCount: 2,
        recentError: 'simulated runtime error',
        suggestedAction: 'Reduce fallback rate by improving prompt contract, model reliability, or context index coverage.',
      },
      model_config_runtime: {
        status: 'watch',
        sampleSize: 2,
        runCount: 2,
        modelUsedRate: 1,
        fallbackRate: 0,
        errorCount: 0,
        warningCount: 0,
        avgDurationMs: 6400,
        retryCount: 1,
        recentError: null,
        suggestedAction: 'Watch retry and latency trend before changing provider priority.',
      },
    },
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
    overview.qualityProfiles && overview.qualityProfiles.event_recommendation,
    'Overview should expose per-agent quality profiles.'
  );
  assert(
    overview.collaborationMap?.some((item) => (
      item.agentId === 'event_recommendation'
      && item.relatedAgents.some((relatedAgent) => relatedAgent.id === 'event_profile_index')
    )),
    'Overview should expose the event recommendation to profile index collaboration.'
  );
  assert(
    overview.modules.some((module) => module.nextImprovements.length > 0),
    'Overview should still expose continuous improvement suggestions.'
  );
  assert(
    overview.runtimeHealth?.event_recommendation?.status === 'degraded',
    'Overview should expose per-agent runtime health.'
  );
  assert(
    overview.modelHealth?.circuitBreakerRecommendation?.automaticAction === false,
    'Model health should expose read-only circuit breaker recommendations.'
  );
  assert(
    overview.modules.some((module) => (
      module.id === 'event_recommendation'
      && module.runtimeHealth?.fallbackRate === 0.5
    )),
    'Overview modules should include runtime health.'
  );
  assert(
    overview.continuousImprovementPlan[0]?.runtimeStatus === 'degraded',
    'Runtime issues should be able to influence continuous improvement priority.'
  );

  const spec = buildAgentSpecMarkdown();
  assert(spec.includes('#### Quality Profile'), 'Generated spec should include quality profile sections.');
  assert(spec.includes('#### Related Agents'), 'Generated spec should include related agent sections.');
  assert(spec.includes('## Runtime Health'), 'Generated spec should include runtime health section.');
  assert(spec.includes('#### Runtime Observability'), 'Generated spec should include per-agent runtime observability sections.');
  assert(spec.includes('Circuit breaker recommendation'), 'Generated spec should include circuit breaker recommendation.');
  assert(
    spec.includes('event_profile_index (context_profile_dependency)'),
    'Generated spec should include explicit related agent reasons.'
  );
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
