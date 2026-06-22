# Official Verification Badge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a Weibo-like official verification marker on public profile and event organization surfaces.

**Architecture:** Reuse existing `profiles.verified`, `profiles.type`, and `profiles.status`. Add one small badge component and expose profile verification metadata in existing event API joins.

**Tech Stack:** React, TailwindCSS, Express, SQLite.

---

## Tasks

- [x] Add a reusable `OfficialVerificationBadge` with tiny exported label helpers.
- [x] Use it on profile page, profile directory, and event organizer displays.
- [x] Return `publisher_profile_verified/status` and `organizer_profile_verified/status` from resource APIs.
- [x] Add zh/en locale labels.
- [x] Run a tiny Node assert check for badge rules plus lint/build.
