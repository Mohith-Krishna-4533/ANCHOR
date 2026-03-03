// ============================================================
// ANCHOR API CLIENT
// ============================================================

// In dev, Vite proxies /api → http://127.0.0.1:5000 (see vite.config.ts)
const BASE_URL = "/api";

// ============================================================
// RAW BACKEND TYPES
// ============================================================

export interface BackendTimelineEntry {
  type: "SOC" | "AML";
  institution: string;
  block_number: number;
  tx_hash: string;
  timestamp: string;
}

export interface BackendNode {
  id: string;
}

export interface BackendEdge {
  source: string;
  target: string;
  amount: number;
  is_latest?: boolean;
}

export interface BackendAIOutput {
  correlated: boolean;
  confidence: number;
  summary: string;
  recommended_action: string;
}

export interface BackendDashboard {
  network_risk: {
    score: number;
    confidence: number;
  };
  burst_detected: boolean;
  burst_tx_count: number;
  burst_total_amount: number;
  timeline: BackendTimelineEntry[];
  graph: {
    nodes: BackendNode[];
    edges: BackendEdge[];
  };
  ai_output: BackendAIOutput;
}

// ============================================================
// FRONTEND TYPES (mirror component interfaces)
// ============================================================

import type { TimelineEntry } from "@/components/BlockchainTimelinePanel";
import type { NetworkNode, NetworkLink } from "@/components/NetworkGraphPanel";
import type { AIExplanation } from "@/components/AIExplanationPanel";

export interface DashboardState {
  riskScore: number;
  confidence: number;
  timeline: TimelineEntry[];
  nodes: NetworkNode[];
  links: NetworkLink[];
  aiData: AIExplanation | null;
}

// ============================================================
// STABLE X/Y FROM NODE ID (deterministic fallback)
// ============================================================

function stableXY(id: string): { x: number; y: number } {
  let hx = 0;
  let hy = 0;
  for (let i = 0; i < id.length; i++) {
    const c = id.charCodeAt(i);
    hx = (hx * 31 + c) >>> 0;
    hy = (hy * 37 + c) >>> 0;
  }
  const norm = (n: number) => 0.1 + ((n % 10000) / 10000) * 0.8;
  return { x: norm(hx), y: norm(hy) };
}

// ============================================================
// PHYSICS LAYOUT
// ============================================================

const physicsCache = new Map<string, { x: number, y: number }>();

function applyPhysicsLayout(nodes: NetworkNode[], links: NetworkLink[]): void {
  // Give initial stable positions so layout doesn't completely randomize every render
  nodes.forEach(n => {
    if (physicsCache.has(n.id)) {
      const pos = physicsCache.get(n.id)!;
      n.x = pos.x;
      n.y = pos.y;
    } else {
      const pos = stableXY(n.id);
      n.x = pos.x;
      n.y = pos.y;
    }
    (n as any).vx = 0;
    (n as any).vy = 0;
  });

  const iterations = 80;
  const k = 0.05; // spring constant
  const repulsion = 0.003;
  const damping = 0.6;

  for (let iter = 0; iter < iterations; iter++) {
    // 1. Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const distSq = dx * dx + dy * dy || 0.0001;
        const force = repulsion / distSq;
        const fx = force * dx;
        const fy = force * dy;
        (nodes[i] as any).vx += fx;
        (nodes[i] as any).vy += fy;
        (nodes[j] as any).vx -= fx;
        (nodes[j] as any).vy -= fy;
      }
    }

    // 2. Attraction along links
    for (const link of links) {
      const source = nodes.find(n => n.id === link.source);
      const target = nodes.find(n => n.id === link.target);
      if (!source || !target) continue;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;

      // Ideal distance ~ 0.2
      const force = k * (dist - 0.2);
      const fx = force * (dx / dist);
      const fy = force * (dy / dist);

      (source as any).vx += fx;
      (source as any).vy += fy;
      (target as any).vx -= fx;
      (target as any).vy -= fy;
    }

    // 3. Gravity towards center (0.5, 0.5)
    for (const n of nodes) {
      (n as any).vx += (0.5 - n.x) * 0.01;
      (n as any).vy += (0.5 - n.y) * 0.01;
    }

    // 4. Update positions
    for (const n of nodes) {
      (n as any).vx *= damping;
      (n as any).vy *= damping;
      n.x += (n as any).vx;
      n.y += (n as any).vy;

      // Keep within bounds
      n.x = Math.max(0.1, Math.min(0.9, n.x));
      n.y = Math.max(0.1, Math.min(0.9, n.y));
    }
  }

  // Save new positions to cache so subsequent renders build upon them smoothly
  nodes.forEach(n => physicsCache.set(n.id, { x: n.x, y: n.y }));
}

// ============================================================
// ADAPTERS
// ============================================================

function adaptTimeline(entries: BackendTimelineEntry[]): TimelineEntry[] {
  return entries.map((e, i) => ({
    id: `${e.block_number}-${i}`,
    blockNumber: e.block_number,
    institution: e.institution,
    timestamp: e.timestamp.length > 8 ? e.timestamp.slice(11, 19) : e.timestamp,
    hash: e.tx_hash,
    type: e.type,
  }));
}

function adaptGraph(
  backendNodes: BackendNode[],
  backendEdges: BackendEdge[],
  suspiciousIds: string[]
): { nodes: NetworkNode[]; links: NetworkLink[] } {
  const nodes: NetworkNode[] = backendNodes.map((n) => ({
    id: n.id,
    label: n.id.length > 12 ? n.id.slice(0, 10) + "…" : n.id,
    suspicious: suspiciousIds.includes(n.id),
    x: 0,
    y: 0,
  }));

  const links: NetworkLink[] = backendEdges.map((e) => ({
    source: e.source,
    target: e.target,
    highlighted: e.is_latest || false,
  }));

  // Apply physics layout to separate nodes
  applyPhysicsLayout(nodes, links);

  return { nodes, links };
}

export function adaptAI(
  ai: BackendAIOutput,
  suspiciousIds: string[]
): AIExplanation | null {
  if (!ai) return null;

  return {
    causalityAssessment: ai.summary || "Pending correlation analysis.",
    flaggedAccounts: suspiciousIds || [],
    riskEscalationReason:
      ai.recommended_action === "freeze_accounts"
        ? "Temporal correlation between credential compromise and fund movement exceeds threshold."
        : ai.recommended_action === "escalate_review"
          ? "Risk pattern detected across domains. Escalation triggered by rule-based threshold breach."
          : "Monitoring continues based on rule-based patterns.",
    confidenceScore: Math.round((ai.confidence || 0) * 100),
    recommendedAction:
      ai.recommended_action === "freeze_accounts"
        ? "Freeze flagged accounts. Initiate cross-institutional incident response protocol ANCHOR-7."
        : ai.recommended_action === "escalate_review"
          ? "Escalate to senior analyst. Coordinate cross-institution response."
          : "Continue monitoring for 48h. No immediate intervention required.",
  };
}

export function adaptDashboard(
  raw: BackendDashboard,
  suspiciousIds: string[] = []
): DashboardState {
  const { nodes, links } = adaptGraph(
    raw.graph.nodes,
    raw.graph.edges,
    suspiciousIds
  );

  return {
    riskScore: raw.network_risk.score,
    confidence: Math.round(raw.network_risk.confidence * 100),
    timeline: adaptTimeline(raw.timeline),
    nodes: nodes,
    links: links,
    // Always pass through AI so rule-based results also update the panel
    aiData: adaptAI(raw.ai_output, suspiciousIds),
  };
}




// ============================================================
// API CALLS
// ============================================================

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${path} → ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export const DEMO_IDENTITY = "ANCHOR_DEMO";

export async function getDashboard(identity = DEMO_IDENTITY): Promise<BackendDashboard> {
  return apiFetch<BackendDashboard>(`/dashboard/${identity}`);
}

export async function runGemini(identity = DEMO_IDENTITY): Promise<BackendAIOutput> {
  return apiFetch<BackendAIOutput>(`/gemini/${identity}`, { method: "POST" });
}

export async function resetIdentity(identity = DEMO_IDENTITY): Promise<{ status: string }> {
  return apiFetch<{ status: string }>(`/reset/${identity}`, { method: "POST" });
}

export async function interveneIdentity(identity = DEMO_IDENTITY): Promise<{ status: string }> {
  return apiFetch<{ status: string }>(`/intervene/${identity}`, { method: "POST" });
}

export interface CreateAlertPayload {
  identity: string;
  type: "SOC" | "AML";
  risk_score: number;
  institution: string;
  account?: string;
}

export async function createAlert(
  payload: CreateAlertPayload
): Promise<{ inserted_id: string }> {
  return apiFetch<{ inserted_id: string }>("/alerts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createTransaction(payload: {
  identity: string;
  from_account: string;
  to_account: string;
  amount: number;
}): Promise<{ inserted_id: string }> {
  return apiFetch<{ inserted_id: string }>("/transactions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function anchorAlert(
  alertId: string
): Promise<{ tx_hash: string; block_number: number; event_hash: string }> {
  return apiFetch("/anchor-alert", {
    method: "POST",
    body: JSON.stringify({ alert_id: alertId }),
  });
}
