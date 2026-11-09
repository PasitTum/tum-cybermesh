# 🏛️ TUM Sovereign CyberMesh
> **Unified Defense Cloud & Autonomous XSIAM Platform**  
> **Classification:** TUM Group Holdings — Sovereign Flagship Commercial Product  
> **Engineering Lead:** K. Pongsak (Threat Modeling & Kernel Telemetry)  
> **Status:** Production-Ready Turnkey Package Verified 🟢

---

## 1. Executive Summary & Production Capabilities
TUM Sovereign CyberMesh provides autonomous eBPF/ETW sensor fleet mesh orchestration and real-world SOAR active response connectors.

### Core Capabilities
1. **Lightweight Edge Sensor Agent (`sensor-agent/`):**
   - **Windows:** Native PowerShell installer (`Install-TumSensorAgent.ps1`) supporting Windows Event Log (Security 4624, 4625, 4688) and Sysmon integration.
   - **Linux:** Native Systemd service unit (`tum-sensor-agent.service`) with kernel eBPF tracepoints (`sys_enter_execve`, `tcp_v4_connect`).
   - Resilient TLS 1.3 heartbeat and buffered telemetry pipeline with automatic local queueing upon network interruption.

2. **Automated SOAR Firewall Connectors (`soar-connectors/`):**
   - **Fortinet FortiGate REST API Connector:** Automated IP quarantine into FortiOS address groups (`POST /api/v2/cmdb/firewall/address`) with session flushing and zero-trust policy enforcement.
   - **Palo Alto Networks PAN-OS DAG Connector:** Dynamic Address Group tag registration via XML-API (`/api/?type=user-id&action=set`) for instant micro-segmentation without firewall policy reload.

3. **Hallmark Console 3D Telemetry HUD:**
   - Real-time 3D sensor mesh topology visualizer built to Hallmark Console Theme v2.0.0 (dark graphite, zero sloplint).

---

## 2. Turnkey Commercial Packaging (`D:\TUM\setup-product\tum-cybermesh`)
The deliverable package in `D:\TUM\setup-product\tum-cybermesh` contains:
- **`sensor-agent/`**: Cross-platform sensor agent CLI with Windows launcher (`tum-sensor-agent.cmd`) and PowerShell runner.
- **`deploy/windows/`**: Automated Windows Service installer script.
- **`deploy/linux/`**: Linux systemd unit file with automated restart policy.
- **`soar-connectors/`**: Production-tested Fortinet and Palo Alto SOAR connector scripts.
- **`smoke-test.ps1`**: Standalone validation runner testing agents and connectors without mocking.

---

## 3. Quick Start & Verification

### Running the Standalone Smoke Test
```powershell
powershell -ExecutionPolicy Bypass -File D:\TUM\setup-product\tum-cybermesh\smoke-test.ps1
```

### Launching the Sensor Agent
```powershell
# Windows CLI
D:\TUM\setup-product\tum-cybermesh\sensor-agent\tum-sensor-agent.cmd --server 127.0.0.1:8080 --tenant TUM-ENTERPRISE-01

# Inspecting SOAR Connectors
node D:\TUM\setup-product\tum-cybermesh\soar-connectors\fortinet-fortigate-connector.js --test
```

---

## 4. Verification Matrix
- **Agent Execution**: Exit code 0, clean heartbeats.
- **SOAR Connectors**: Validated against Fortinet REST schema and Palo Alto XML-API payload.
- **Audit Verification**: Passed in master commercial fleet suite (`test-master-audit.ps1`).
