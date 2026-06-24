# Design: Smart AI Assistant V2

## Product Direction

The target is not a decorative chatbot. The assistant should behave like a decision partner:

1. Understand what the user wants.
2. Use a prepared index/profile so it does not scan everything live.
3. Ask the large model to reason over only the relevant context.
4. Return a structured, explainable answer.
5. Stay usable when the model is slow or unstable.

This is the same architecture needed for activities, parsing, admin governance, and future recommendation modules.

## First Slice

The first V2 slice adds a hackathon AI coach. It is valuable because `/hackathon` already has a complex decision surface: eligibility, tools, preparation, track choice, time strategy, submission quality, and confidence. A static FAQ cannot answer personal questions well.

## Shared Orchestration Contract

The shared orchestrator wraps the existing model runtime and standardizes:

- task name,
- system prompt,
- JSON contract,
- model status,
- normalized fallback status,
- model-attempt logging shape.

It does not replace `unifiedAiRuntimeService`; it provides a product-facing layer above it so every assistant can call models the same way.

## Hackathon Context Index

The first version uses a small local index, built from stable hackathon facts:

- competition format,
- allowed tools,
- judging priorities,
- participant profiles,
- preparation advice cards,
- risk cards,
- deliverables,
- registration context.

This is intentionally not a vector database yet. It is fast, deterministic, and easy to validate. Later it can be replaced by embeddings with the same output contract.

## Response Shape

The endpoint returns:

- `type`: always `hackathon_coach`,
- `summary`: short answer,
- `intent`: structured user intent,
- `recommendation`: track/focus/persona recommendation,
- `prepPlan`: 3-6 concrete steps,
- `strategy`: event-day strategy,
- `risks`: risk notes with mitigation,
- `sources`: context cards used,
- `confidence`: 0-1,
- `modelStatus`: model/fallback status.

## Fallback

Fallback is not a hidden failure. When the model fails:

- use lexical/semantic signals to infer intent,
- select matching context cards,
- return a practical plan,
- set `modelStatus.used=false`,
- set `modelStatus.fallbackUsed=true`,
- include a warning that the answer did not complete model reasoning.

## Future Iterations

After this slice works, the same architecture can expand to:

- event assistant V2 rerank evaluation set,
- WeChat/article parsing assistant,
- admin data governance with model-backed low-confidence review,
- user memory and feedback learning,
- optional embeddings for larger event pools.
