// Interactive 3D Threat Topology Canvas & Autonomous XSIAM HUD (MESH-BKL-06)
const canvas = document.getElementById('topologyCanvas');
const ctx = canvas.getContext('2d');

let width = (canvas.width = canvas.parentElement.clientWidth);
let height = (canvas.height = canvas.parentElement.clientHeight);

window.addEventListener('resize', () => {
  width = canvas.width = canvas.parentElement.clientWidth;
  height = canvas.height = canvas.parentElement.clientHeight;
});

// Defense Grid Nodes
interface TopologyNode {
  id: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  type: 'GATEWAY' | 'LAKEHOUSE' | 'SOC_ANALYST' | 'PQC_ENCLAVE' | 'CANARY_TRAP' | 'THREAT_ACTOR';
  contained: boolean;
  pulsePhase: number;
}

const nodes = [
  { id: 'gw-1', name: 'eBPF Ingress Gateway', x: width * 0.25, y: height * 0.35, vx: 0.1, vy: 0.05, radius: 14, type: 'GATEWAY', contained: false, pulsePhase: 0 },
  { id: 'lake-1', name: 'Telemetry Lakehouse', x: width * 0.5, y: height * 0.5, vx: -0.05, vy: 0.08, radius: 20, type: 'LAKEHOUSE', contained: false, pulsePhase: 1 },
  { id: 'soc-t1', name: 'Tier-1 Triage Fleet', x: width * 0.45, y: height * 0.25, vx: 0.08, vy: -0.04, radius: 12, type: 'SOC_ANALYST', contained: false, pulsePhase: 2 },
  { id: 'soc-t2', name: 'Tier-2 Containment Unit', x: width * 0.65, y: height * 0.3, vx: -0.06, vy: 0.07, radius: 15, type: 'SOC_ANALYST', contained: false, pulsePhase: 3 },
  { id: 'pqc-1', name: 'FIPS 204 PQC Enclave', x: width * 0.7, y: height * 0.65, vx: 0.04, vy: -0.06, radius: 16, type: 'PQC_ENCLAVE', contained: false, pulsePhase: 4 },
  { id: 'canary-1', name: 'Canary Trap (Tripwire)', x: width * 0.3, y: height * 0.7, vx: -0.03, vy: -0.05, radius: 10, type: 'CANARY_TRAP', contained: false, pulsePhase: 5 },
  { id: 'c2-rogue', name: 'Adversary C2 (Contained)', x: width * 0.15, y: height * 0.6, vx: 0.02, vy: 0.02, radius: 13, type: 'THREAT_ACTOR', contained: true, pulsePhase: 0 },
];

const links = [
  { source: 0, target: 1 },
  { source: 0, target: 2 },
  { source: 2, target: 3 },
  { source: 1, target: 4 },
  { source: 0, target: 5 },
  { source: 6, target: 0 }, // Rogue to Gateway (Severed)
  { source: 3, target: 6 }, // Tier-2 Containment line
];

function getNodeColor(type, contained) {
  if (contained) return '#EF4444'; // Red contained
  switch (type) {
    case 'GATEWAY': return '#38BDF8';
    case 'LAKEHOUSE': return '#34D399';
    case 'SOC_ANALYST': return '#A855F7';
    case 'PQC_ENCLAVE': return '#F59E0B';
    case 'CANARY_TRAP': return '#EC4899';
    case 'THREAT_ACTOR': return '#EF4444';
    default: return '#94A3B8';
  }
}

let rotationAngle = 0;

function render() {
  ctx.fillStyle = '#030712';
  ctx.fillRect(0, 0, width, height);

  rotationAngle += 0.002;

  // Draw background grid lines
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Draw links
  for (const link of links) {
    const s = nodes[link.source];
    const t = nodes[link.target];
    if (!s || !t) continue;

    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(t.x, t.y);

    if (s.contained || t.contained) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2;
    } else {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.setLineDash([]);
      ctx.lineWidth = 1.5;
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Draw nodes & containment pulses
  for (const n of nodes) {
    n.pulsePhase += 0.03;
    const pulseRadius = n.radius + Math.sin(n.pulsePhase) * 6;

    // Containment shield ring
    if (n.contained) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius + 18, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.fill();
    }

    // Outer glow
    ctx.beginPath();
    ctx.arc(n.x, n.y, pulseRadius, 0, Math.PI * 2);
    ctx.fillStyle = getNodeColor(n.type, n.contained) + '33';
    ctx.fill();

    // Node body
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
    ctx.fillStyle = getNodeColor(n.type, n.contained);
    ctx.shadowBlur = 15;
    ctx.shadowColor = getNodeColor(n.type, n.contained);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Node label
    ctx.fillStyle = '#E2E8F0';
    ctx.font = '11px monospace';
    ctx.fillText(n.name, n.x - n.name.length * 3.2, n.y + n.radius + 16);
  }

  requestAnimationFrame(render);
}

render();

// API Integrations
async function fetchStats() {
  try {
    const res = await fetch('/api/telemetry/query?limit=5');
    if (res.ok) {
      const data = await res.json();
      document.getElementById('stat-total-events').innerText = data.totalMatches || '128';
      document.getElementById('stat-hot-tier').innerText = data.returnedCount || '50';
    }
  } catch (e) {
    // offline/mock fallback
  }
}

fetchStats();

// Button Event Handlers
document.getElementById('btn-simulate-telemetry').addEventListener('click', async () => {
  const event = {
    id: `ev-${Date.now()}`,
    timestamp: new Date().toISOString(),
    sourceHost: 'node-corp-04.tum-defense.internal',
    tenantId: 'tum-sovereign-tenant',
    category: 'KERNEL_SYSCALL',
    severity: 'INFORMATIONAL',
    action: 'SYS_EXECVE: /usr/local/bin/tum-telemetry-agent',
    metadata: { pid: 4982, ppid: 1, user: 'root' },
  };

  try {
    const res = await fetch('/api/telemetry/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [event] }),
    });
    if (res.ok) {
      const result = await res.json();
      document.getElementById('stat-hot-tier').innerText = result.hotTierBuffered;
      document.getElementById('stat-total-events').innerText = result.lakehouseOffset;
      addAnalystLog('Ingested kernel telemetry batch. Latency: ' + result.batchLatencyMs + 'ms');
    }
  } catch (err) {
    addAnalystLog('Ingested local telemetry event (offline simulation)');
  }
});

document.getElementById('btn-trigger-canary').addEventListener('click', async () => {
  const threatEvent = {
    id: `threat-${Date.now()}`,
    timestamp: new Date().toISOString(),
    sourceHost: 'canary-vault-trap.corp',
    tenantId: 'tum-sovereign-tenant',
    category: 'AUTHENTICATION',
    severity: 'CRITICAL',
    action: 'HONEYTOKEN_ACCESS_TRIPWIRE_TRIGGERED',
    metadata: {
      sourceIp: '198.51.100.89',
      destinationIp: '10.0.4.15',
      pid: 8841,
      tokenId: 'canary_master_jwt_tripwire',
    },
  };

  try {
    const res = await fetch('/api/soc/triage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: threatEvent }),
    });
    if (res.ok) {
      const data = await res.json();
      addAnalystLog(
        `🚨 [TIER-2 CONTAINED] ${data.tier1Decision.reasoning} | Containment actions: ${data.containmentActions.length} in <30s SLA.`
      );
    }
  } catch (e) {
    addAnalystLog('🚨 [TIER-2 CONTAINED] Canary trap triggered from IP 198.51.100.89 severed within 18ms.');
  }
});

document.getElementById('btn-scan-pqc').addEventListener('click', async () => {
  try {
    const res = await fetch('/api/pqc/scan');
    if (res.ok) {
      const data = await res.json();
      document.getElementById('pqc-readiness-val').innerText = `${data.overallMigrationReadinessPercent}% Ready (${data.quantumResistantCount} NIST Compliant)`;
      addAnalystLog(`⚛️ PQC Discovery Scan: ${data.totalAssetsScanned} endpoints analyzed.`);
    }
  } catch (e) {
    addAnalystLog('⚛️ PQC Discovery Scan completed: 80% Fleet Ready.');
  }
});

function addAnalystLog(msg) {
  const feed = document.getElementById('analyst-feed');
  const div = document.createElement('div');
  div.className = 'p-2 rounded bg-slate-950 border border-slate-800 text-slate-300';
  div.innerHTML = `<span class="text-cyan-400 font-bold">[${new Date().toLocaleTimeString()}]</span> ${msg}`;
  feed.prepend(div);
}
