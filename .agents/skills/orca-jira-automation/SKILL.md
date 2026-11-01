---
name: orca-jira-automation
description: Autonomous Jira project management and sprint tracking using the Orca CLI. Activates automatically on every coding, refactoring, feature, bugfix, or strategic task without requiring explicit prompt from the CEO.
license: Apache-2.0
metadata:
  origin: TUM-Group-Holdings
---

# Orca Jira Automation Skill (Autonomous Execution)

## Purpose & Core Directive

This skill governs the automated interaction with the TUM Group Jira Cloud instance (`https://daywakler.atlassian.net`) via the `orca` CLI.

> [!IMPORTANT]
> **AUTONOMOUS EXECUTION MANDATE:**
> The AI agent (Antigravity) MUST proactively run this workflow on **every single task, sprint cycle, feature delivery, bug fix, and architectural reorganization**, WITHOUT waiting for the CEO (or user) to command it manually.
> The CEO should never have to micromanage Jira ticket statuses, creation, or progress comments.

---

## 1. Environment & Site Configuration

- **Jira Cloud Site ID:** `z-3mP_i47N7xAgZ9psDZoJll` (`https://daywakler.atlassian.net`)
- **Default Project Key:** `SCRUM`
- **Issue Types:**
  - `Task` (ID: `10004`)
  - `Feature` (ID: `10003`)
  - `Epic` (ID: `10001`)
  - `Subtask` (ID: `10002`)
- **Priorities:**
  - `1`: Highest
  - `2`: High
  - `3`: Medium
  - `4`: Low
  - `5`: Lowest
- **Board Workflow Status Transitions:**
  - `11`: Idea
  - `21`: To Do
  - `31`: In Progress
  - `41`: Testing
  - `51`: Done

---

## 2. Autonomous Task Lifecycle Workflow

Whenever a user request arrives or an engineering phase commences, execute the following 4-stage loop:

### Stage 1: Triage & Issue Selection / Creation (Automatic at Start)
1. Search Jira for active or relevant issues:
   ```bash
   orca jira search "project = SCRUM AND status in ('To Do', 'In Progress') ORDER BY key ASC" --site z-3mP_i47N7xAgZ9psDZoJll
   ```
2. If an issue already exists for the work (e.g., `SCRUM-15`), take ownership and transition it to **In Progress** (`31`):
   ```bash
   orca jira status set SCRUM-15 --to-id 31 --site z-3mP_i47N7xAgZ9psDZoJll
   ```
3. If no matching issue exists for the CEO's directive, autonomously create one:
   ```bash
   orca jira create --project SCRUM --type Task --summary "[Scope] Descriptive Title" --description "Detailed implementation details" --site z-3mP_i47N7xAgZ9psDZoJll
   ```

### Stage 2: In-Flight Progress & Transparency
1. When significant milestones or verification steps complete, post an executive audit comment to the Jira ticket:
   ```bash
   orca jira comment add <ISSUE-KEY> --body "Automated Progress Update: Completed verification loop with 125/125 passing tests." --site z-3mP_i47N7xAgZ9psDZoJll
   ```

### Stage 3: Verification & Closure (Automatic at Completion)
1. Run local verification gates (`dotnet test -f net8.0`).
2. Move the issue to **Testing** (`41`) if human QA is needed, or directly to **Done** (`51`) if tests pass 100%:
   ```bash
   orca jira status set <ISSUE-KEY> --to-id 51 --site z-3mP_i47N7xAgZ9psDZoJll
   ```

### Stage 4: Webhook & Discord Sync
1. The Jira automation webhook will automatically broadcast the transition to the `#doc` Discord channel.
2. If additional executive announcements (such as slide decks or HR progress) are produced, dispatch the payload to the Discord webhook directly.

---

## 3. Quick Reference Commands

| Operation | Command Example |
| :--- | :--- |
| **Search active issues** | `orca jira search "project = SCRUM AND status != Done" --site z-3mP_i47N7xAgZ9psDZoJll` |
| **Create new Task** | `orca jira create --project SCRUM --type Task --summary "..." --site z-3mP_i47N7xAgZ9psDZoJll` |
| **Transition to In Progress** | `orca jira status set <KEY> --to-id 31 --site z-3mP_i47N7xAgZ9psDZoJll` |
| **Transition to Testing** | `orca jira status set <KEY> --to-id 41 --site z-3mP_i47N7xAgZ9psDZoJll` |
| **Transition to Done** | `orca jira status set <KEY> --to-id 51 --site z-3mP_i47N7xAgZ9psDZoJll` |
| **Add Jira Comment** | `orca jira comment add <KEY> --body "..." --site z-3mP_i47N7xAgZ9psDZoJll` |
| **Set Priority** | `orca jira priority set <KEY> --priority-id 1 --site z-3mP_i47N7xAgZ9psDZoJll` |
| **Add Label** | `orca jira label add <KEY> --label sprint-2 --site z-3mP_i47N7xAgZ9psDZoJll` |
