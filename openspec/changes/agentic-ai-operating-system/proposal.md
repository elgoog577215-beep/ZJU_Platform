# Agentic AI Operating System

## Why

The site already has several AI-facing surfaces: activity recommendations, hackathon coaching, WeChat parsing, admin governance, model configuration, and event profile indexing. They share some runtime pieces, but the operating rules still live across separate files and human memory.

The next step is to make the AI layer maintainable as an agent system. Each agent needs declared prompt templates, logic chain, standard libraries, context indexes, output contracts, validation, fallback, evaluation checks, observability, safety boundaries, and an auto-updating spec.

## Goals

- Create a machine-readable registry for every production AI agent/module.
- Make the registry the source for admin overview modules and generated documentation.
- Add repeatable checks so missing prompts, logic chains, standards, fallbacks, or evaluations are caught automatically.
- Preserve existing public APIs and avoid database migrations in the first slice.
- Establish an operating loop: target -> tasks -> completion analysis -> next gap.

## Non-Goals

- Do not rewrite every assistant's business logic in this slice.
- Do not add a vector database yet.
- Do not move API keys or expose secrets.
- Do not automatically mutate production data beyond existing admin-reviewed governance apply flow.
- Do not remove existing event assistant, hackathon, or WeChat parser endpoints.

## Impact

- Backend:
  - Add an AI agent registry service.
  - Reuse the registry in unified assistant overview.
  - Add registry health checks and generated spec tooling.
- Frontend:
  - Admin AI overview receives richer module metadata without changing endpoint shape.
- Data:
  - No schema changes.
- AI / standard data:
  - Define common maturity dimensions across prompts, logic chains, standard libraries, indexes, memory, contracts, guardrails, fallback, evaluation, observability, auto-update, safety, and cost.
- Deployment:
  - Code-only change. Existing model config continues to power model calls.

## Operating Loop

1. Define target maturity dimensions for each agent.
2. Read registry completion and high-priority gaps.
3. Pick the smallest safe gap-closing task.
4. Implement.
5. Run registry checks plus focused AI checks.
6. Update generated spec from registry.
7. Compare actual maturity to target and repeat.
