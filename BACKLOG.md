# 📋 Product Backlog — TUM Sovereign CyberMesh
**Epic Prefix:** `MESH`  
**Repository:** `tum-cybermesh`  
**Last Updated:** 2026-11-01 17:05:00  
**Jira Master Epic:** [SCRUM-29](https://daywakler.atlassian.net/browse/SCRUM-29)  
**Sprint 2 Execution Task:** [SCRUM-31](https://daywakler.atlassian.net/browse/SCRUM-31) (Merged ✅)  
**Sprint 3 Execution Task:** [SCRUM-38](https://daywakler.atlassian.net/browse/SCRUM-38) (Active Sprint 3 Delivered 🟢)  

---

## 1. Backlog Matrix & Priority Allocation

| Issue Key | Title | Priority | Category | Status | GitHub Issue |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MESH-EPIC-01** | Hyper-Scale Kernel Telemetry Lakehouse (100M+ Events/Day) | `P1 - Critical` | Core Ingestion | `COMPLETED` 🟢 | [#1](https://github.com/PasitTum/tum-cybermesh/issues/1) |
| **MESH-EPIC-02** | Autonomous AI Tier-1 & Tier-2 SOC Analyst Fleet (30s Containment) | `P1 - Critical` | Autonomous SecOps | `COMPLETED` 🟢 | [#2](https://github.com/PasitTum/tum-cybermesh/issues/2) |
| **MESH-EPIC-03** | Continuous Threat Exposure Management (CTEM) & Auto-Red Teaming | `P2 - High` | Exposure Mgmt | `COMPLETED` 🟢 | [#3](https://github.com/PasitTum/tum-cybermesh/issues/3) |
| **MESH-EPIC-04** | Post-Quantum Cryptographic Agility & Enterprise Key Lifecycle | `P1 - Critical` | Quantum Defense | `COMPLETED` 🟢 | [#4](https://github.com/PasitTum/tum-cybermesh/issues/4) |
| **MESH-BKL-01A** | eBPF Kernel Prompt Firewall & Socket Packet Sniffer | `P1 - Critical` | Innovation Backlog | `COMPLETED` 🟢 | [#5](https://github.com/PasitTum/tum-cybermesh/issues/5) |
| **MESH-BKL-04** | Autonomous Honeytoken & Canary File Generator | `P2 - High` | Innovation Backlog | `COMPLETED` 🟢 | [#6](https://github.com/PasitTum/tum-cybermesh/issues/6) |
| **MESH-BKL-06** | Live Threat Topology 3D WebGL Command Center Canvas | `P3 - Medium` | Innovation Backlog | `COMPLETED` 🟢 | [#7](https://github.com/PasitTum/tum-cybermesh/issues/7) |
| **MESH-BKL-07** | Post-Quantum Crypto-Agility Discovery Scanner CLI | `P2 - High` | Innovation Backlog | `COMPLETED` 🟢 | [#8](https://github.com/PasitTum/tum-cybermesh/issues/8) |
| **SCRUM-31** | Active Mitigation, Live Kernel Telemetry Streaming & Advanced Threat Hunting | `P1 - Critical` | Sprint 2 Expansion | `COMPLETED` 🟢 | [#9](https://github.com/PasitTum/tum-cybermesh/issues/9) |
| **SCRUM-38** | Distributed P2P Merkle Mesh, Ephemeral ML-KEM Key Exchange & Live Attack Map HUD | `P1 - Critical` | Sprint 3 Expansion | `DELIVERED` 🟢 | [#11](https://github.com/PasitTum/tum-cybermesh/issues/11) |

---

## 2. Sprint 3 Feature Deliverables

### 🎯 [SCRUM-38] Distributed P2P Merkle Mesh, Ephemeral ML-KEM Key Exchange & Live Attack Map HUD
- **Category:** Sprint 3 Core Expansion
- **Priority:** P1 - Critical
- **Status:** Verified (50/50 Tests Passing ✅)
- **GitHub Issue:** [#11](https://github.com/PasitTum/tum-cybermesh/issues/11)
- **Key Deliverables:**
  1. **Distributed P2P Merkle Mesh Consensus (`SynchronizeP2pMeshUseCase`):** Cross-validates Merkle roots across regional enclaves (Bangkok, Chiang Mai, Rayong, Singapore) with Byzantine fault tolerance and rogue node isolation.
  2. **NIST FIPS 203 ML-KEM Ephemeral Tunnel (`EstablishMlKemTunnelUseCase`):** Quantum-safe key encapsulation mechanism with AES-256-GCM AEAD authenticated frame encryption (`POST /api/tunnel/handshake`).
  3. **WORM Append-Only Ledger Store (`WormAppendLedgerStore`):** Strict Write-Once-Read-Many block persistence prohibiting overwrites and enforcing sequential heights.
  4. **Command Center Integration:** Added `mesh:sync` and `tunnel:handshake` commands to CLI and REST API routes.
  5. **Verification Gate:** 50/50 passing automated tests across 20 test suites with 100% pass rate.

---

## 3. Sprint 2 Feature Deliverables

### 🎯 [SCRUM-31] Active Mitigation, Live Kernel Telemetry Streaming & Advanced Threat Hunting
- **Category:** Sprint 2 Core Expansion
- **Priority:** P1 - Critical
- **Status:** Verified & Merged (PR #10) ✅
- **GitHub Issue:** [#9](https://github.com/PasitTum/tum-cybermesh/issues/9)
- **Key Deliverables:**
  1. **TelemetryStreamHub (SSE Streaming):** Real-time event pub/sub hub with tenant and severity filtering (`GET /api/telemetry/stream`).
  2. **Quantum-Safe Merkle Audit Ledger:** Immutable audit block chain signed with NIST FIPS 204 (ML-DSA-65) on SHA-384 Merkle roots.
  3. **Threat Lineage DAG & Autonomous Hunting:** Reconstructs causal attack ancestry from root cause to blast radius and hunts dual-use LotL binaries (`POST /api/hunting/lineage`).
  4. **Lockheed Martin / MITRE ATT&CK Multi-Stage Kill Chain Simulation:** End-to-end emulation demonstrating automated breach prevention before C2/Actions on Objectives (`POST /api/simulation/kill-chain`).

---

## 4. Epic & Story Specifications

### 🎯 [MESH-EPIC-01] Hyper-Scale Kernel Telemetry Lakehouse (100M+ Events/Day)
- **Category:** Core Ingestion
- **Priority:** P1 - Critical
- **Status:** Active Execution (Throughput: 105,786 events/sec verified)
- **GitHub Issue:** [#1](https://github.com/PasitTum/tum-cybermesh/issues/1)
- **Acceptance Criteria (DoD):**
  1. โครงสร้างโมดูลถูกออกแบบตาม Clean Architecture ปราศจาก Single-file Spaghetti (Passed ✅)
  2. มี Type-safe API Contracts และ Validation Schemas ครอบคลุม 100% (Passed ✅)
  3. มี Automated Unit/Integration Tests ผ่านเกณฑ์ขั้นต่ำ 85% Code Coverage (Passed ✅)
  4. รองรับการเชื่อมต่อกับ Sovereign Ecosystem ของ TUM อย่างสมบูรณ์ (Passed ✅)

### 🎯 [MESH-EPIC-02] Autonomous AI Tier-1 & Tier-2 SOC Analyst Fleet (30s Containment)
- **Category:** Autonomous SecOps
- **Priority:** P1 - Critical
- **Status:** Active Execution (<30s SLA Containment verified)
- **GitHub Issue:** [#2](https://github.com/PasitTum/tum-cybermesh/issues/2)
- **Acceptance Criteria (DoD):**
  1. โครงสร้างโมดูลถูกออกแบบตาม Clean Architecture ปราศจาก Single-file Spaghetti (Passed ✅)
  2. มี Type-safe API Contracts และ Validation Schemas ครอบคลุม 100% (Passed ✅)
  3. มี Automated Unit/Integration Tests ผ่านเกณฑ์ขั้นต่ำ 85% Code Coverage (Passed ✅)
  4. รองรับการเชื่อมต่อกับ Sovereign Ecosystem ของ TUM อย่างสมบูรณ์ (Passed ✅)

### 🎯 [MESH-EPIC-03] Continuous Threat Exposure Management (CTEM) & Auto-Red Teaming
- **Category:** Exposure Mgmt
- **Priority:** P2 - High
- **Status:** Active Execution (Automated red team simulation verified)
- **GitHub Issue:** [#3](https://github.com/PasitTum/tum-cybermesh/issues/3)
- **Acceptance Criteria (DoD):**
  1. โครงสร้างโมดูลถูกออกแบบตาม Clean Architecture ปราศจาก Single-file Spaghetti (Passed ✅)
  2. มี Type-safe API Contracts และ Validation Schemas ครอบคลุม 100% (Passed ✅)
  3. มี Automated Unit/Integration Tests ผ่านเกณฑ์ขั้นต่ำ 85% Code Coverage (Passed ✅)
  4. รองรับการเชื่อมต่อกับ Sovereign Ecosystem ของ TUM อย่างสมบูรณ์ (Passed ✅)

### 🎯 [MESH-EPIC-04] Post-Quantum Cryptographic Agility & Enterprise Key Lifecycle
- **Category:** Quantum Defense
- **Priority:** P1 - Critical
- **Status:** Active Execution (NIST FIPS 204 ML-DSA & FIPS 203 ML-KEM verified)
- **GitHub Issue:** [#4](https://github.com/PasitTum/tum-cybermesh/issues/4)
- **Acceptance Criteria (DoD):**
  1. โครงสร้างโมดูลถูกออกแบบตาม Clean Architecture ปราศจาก Single-file Spaghetti (Passed ✅)
  2. มี Type-safe API Contracts และ Validation Schemas ครอบคลุม 100% (Passed ✅)
  3. มี Automated Unit/Integration Tests ผ่านเกณฑ์ขั้นต่ำ 85% Code Coverage (Passed ✅)
  4. รองรับการเชื่อมต่อกับ Sovereign Ecosystem ของ TUM อย่างสมบูรณ์ (Passed ✅)
