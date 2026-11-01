# AGENTS.md — TUM Sovereign CyberMesh Engineering Harness

This repository is governed by the **ECC (Agent Harness OS)** engineering standards adapted for the **TUM Sovereign CyberMesh** defense cloud & autonomous XSIAM ecosystem. All AI agents (Antigravity, Gemini CLI, Claude Code) must adhere to these guidelines.

---

## 1. Project Context & Architecture

- **Project**: `TUM Sovereign CyberMesh` (`tum-cybermesh`)
- **Classification**: TUM Group Holdings — Sovereign Flagship Product
- **Purpose**: Autonomous XSIAM & Unified Defense Cloud Platform
- **Lead**: K. Pongsak (Threat Modeling & Kernel Telemetry)
- **Target Architecture**: Clean Architecture / Hexagonal Architecture
  - `src/domain`: Core domain models, entities, threat events, PQC cryptographic contracts
  - `src/application`: Use cases, CQRS command/query handlers, autonomous SOC analyst fleet orchestrator, CTEM engine
  - `src/infrastructure`: Telemetry Lakehouse, eBPF socket filter, PQC NIST FIPS 204 crypto engine, honeytoken generator
  - `src/presentation`: Interactive Web HUD, REST API, CLI Command Center
  - `tests`: Comprehensive unit, integration, and E2E verification test suites

---

## 2. Core Engineering Principles

1. **Clean Architecture & Zero-Toy Policy**: No single-file spaghetti or toy scripts. All production code must be structured in modular enterprise layers.
2. **Autonomous Orca Jira & GitHub Issues Synchronization (MANDATORY)**:
   - All AI agents MUST automatically use `orca jira` CLI and `gh issue` CLI on **every single task, sprint cycle, feature delivery, bug fix, and architectural reorganization**.
   - Proactively update Jira ticket statuses (`To Do` -> `In Progress` -> `Testing` -> `Done`), create/sync matching GitHub Issues, and post progress audit comments.
   - **The CEO NEVER needs to manually request or remind the agent to use Orca/Jira or GitHub Issues.**
3. **PQC-Ready & Zero-Trust by Default**: All communications and audit logs must support NIST FIPS 204 post-quantum cryptographic envelopes and zero-trust verification.
4. **Strict Verification**: Every change must pass build, type-check, and automated test gates with >= 85% code coverage.
5. **No Secret Leakage**: Zero hardcoded secrets, production tokens, or unencrypted keys.

---

## 3. Discovered Skills Catalog

The repository provides specialized skills in `.agents/skills/`:
- `orca-jira-automation`: Autonomous Jira project management and sprint tracking.
- `verification-loop`: Pre-commit 6-phase verification (build, lint, test, security audit).
- `agent-self-evaluation`: Quality and completeness scoring.
- `safety-guard`: Guardrails against destructive shell operations.
- `security-review`: Zero-trust boundary and cryptographic audit.
