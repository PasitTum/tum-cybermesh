# GEMINI.md — TUM Sovereign CyberMesh (Antigravity & Gemini CLI)

This project enforces the ECC-adapted engineering harness for Google Antigravity and Gemini CLI.

See [AGENTS.md](./AGENTS.md) for repository architecture, core principles, and the full skills catalog.

## Antigravity Workspace Guidelines

- **Autonomous Orca Jira & GitHub Issues Synchronization (MANDATORY)**:
  - On **EVERY SINGLE TASK, PROMPT, FEATURE, BUG FIX, OR SPRINT DELIVERY**, the agent MUST proactively invoke the `orca` CLI to search, create, update, or transition Jira tickets, and synchronize corresponding **GitHub Issues** on target repositories (`gh issue create/edit/close`).
  - **The CEO NEVER needs to manually request Orca, Jira, or GitHub Issue operations.** It is a built-in default reflex of the agent.
  - Jira site: `z-3mP_i47N7xAgZ9psDZoJll` (`https://daywakler.atlassian.net`), Project: `SCRUM`.
  - Epic Reference: `SCRUM-29` ([EPIC] TUM Sovereign CyberMesh: Autonomous XSIAM & Defense Cloud).
- **Clean Architecture Enforcement**: Strictly adhere to Hexagonal / Clean Architecture (`domain`, `application`, `infrastructure`, `presentation`).
- **PQC Cryptographic Agility**: Support NIST FIPS 204 (ML-DSA) and FIPS 203 (ML-KEM) compliant cryptographic structures.
- **Verification Loop**: Run `npm test` and `npm run build` using `run_command` before concluding any feature phase.
