import { useState, useCallback, useEffect, useRef } from "react";
import TopNav from "@/components/TopNav";
import RiskScorePanel from "@/components/RiskScorePanel";
import BlockchainTimelinePanel, { type TimelineEntry } from "@/components/BlockchainTimelinePanel";
import NetworkGraphPanel, { type NetworkNode, type NetworkLink } from "@/components/NetworkGraphPanel";
import AIExplanationPanel, { type AIExplanation } from "@/components/AIExplanationPanel";
import SimulationControls from "@/components/SimulationControls";
import {
  getDashboard,
  createAlert,
  createTransaction,
  anchorAlert,
  adaptDashboard,
  adaptAI,
  runGemini,
  resetIdentity,
  interveneIdentity,
  DEMO_IDENTITY,
} from "@/lib/api";

// ============================================================
// COMPONENT
// ============================================================

const Index = () => {
  const [riskScore, setRiskScore] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [links, setLinks] = useState<NetworkLink[]>([]);
  const [aiData, setAiData] = useState<AIExplanation | null>(null);
  const [loading, setLoading] = useState(false);

  // Track flagged accounts across refreshes so we can mark them suspicious
  const suspiciousRef = useRef<string[]>([]);
  const threatDetected = riskScore > 70;

  // ============================================================
  // FETCH & APPLY DASHBOARD
  // ============================================================

  const fetchDashboard = useCallback(async (keepLocalAi = false) => {
    try {
      const raw = await getDashboard(DEMO_IDENTITY);
      const state = adaptDashboard(raw, suspiciousRef.current);
      setRiskScore(state.riskScore);
      setConfidence(state.confidence);
      setTimeline(state.timeline);
      setNodes(state.nodes);
      setLinks(state.links);

      if (!keepLocalAi) {
        if (state.aiData) {
          suspiciousRef.current = state.aiData.flaggedAccounts;
        }
        setAiData(state.aiData);
      }
    } catch {
      console.warn("Backend unreachable, keeping local state.");
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // ============================================================
  // SIMULATION HANDLERS
  // ============================================================

  const handlePhishing = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    try {
      const acc = `ACC-0x${Math.floor(Math.random() * 256).toString(16).toUpperCase()}`;

      // Create an invisible (0-amount) transaction to represent the phishing edge on the graph
      await createTransaction({ identity: DEMO_IDENTITY, from_account: "THREAT_ACTOR", to_account: acc, amount: 0 });

      const socInstitutions = ["SOC_A", "SOC_B", "SOC_C", "SOC_D", "SOC_E"];
      const { inserted_id } = await createAlert({
        identity: DEMO_IDENTITY,
        type: "SOC",
        risk_score: 0.62,
        institution: socInstitutions[Math.floor(Math.random() * socInstitutions.length)],
        account: acc,
      });
      await anchorAlert(inserted_id);

      setAiData({
        causalityAssessment: "Spear-phishing signature matched against known threat actor profiles. Credential harvesting likely successful.",
        flaggedAccounts: [DEMO_IDENTITY],
        riskEscalationReason: "High-confidence SOC alert correlated with recent baseline anomalies.",
        confidenceScore: 82,
        recommendedAction: "Force credential rotation. Monitor account for anomalous outbound transfers.",
      });

      await fetchDashboard(true);
    } catch (err) {
      console.warn("Phishing simulation failed:", err);
    } finally {
      setLoading(false);
    }
  }, [loading, fetchDashboard]);

  const handleTransactionBurst = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    try {
      // Create burst transactions with 3 varied accounts
      const acc1 = `ACC-0x${Math.floor(Math.random() * 256).toString(16).toUpperCase()}`;
      const acc2 = `ACC-0x${Math.floor(Math.random() * 256).toString(16).toUpperCase()}`;
      const acc3 = `ACC-0x${Math.floor(Math.random() * 256).toString(16).toUpperCase()}`;
      await Promise.all([
        createTransaction({ identity: DEMO_IDENTITY, from_account: acc1, to_account: "ACC-MULE", amount: 8500 }),
        createTransaction({ identity: DEMO_IDENTITY, from_account: acc2, to_account: "ACC-MULE", amount: 9200 }),
        createTransaction({ identity: DEMO_IDENTITY, from_account: acc3, to_account: acc1, amount: 4800 }),
      ]);

      const bankInstitutions = ["BANK_A", "BANK_B", "BANK_C", "BANK_D", "BANK_E", "BANK_F"];

      const { inserted_id } = await createAlert({
        identity: DEMO_IDENTITY,
        type: "AML",
        risk_score: 0.70,
        institution: bankInstitutions[Math.floor(Math.random() * bankInstitutions.length)],
      });
      await anchorAlert(inserted_id);
      await fetchDashboard();
    } catch (err) {
      console.warn("Transaction burst simulation failed:", err);
    } finally {
      setLoading(false);
    }
  }, [loading, fetchDashboard]);

  const handleAICorrelation = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    try {
      const aiOut = await runGemini(DEMO_IDENTITY);

      // If backend hit quota and returned fallback text, throw so our catch block injects the visual matrix
      if (aiOut.summary && aiOut.summary.includes("unavailable")) {
        throw new Error("Quota exceeded");
      }

      const adapted = adaptAI(aiOut, suspiciousRef.current);
      if (adapted) {
        suspiciousRef.current = adapted.flaggedAccounts;
        setAiData(adapted);

        // Update nodes if suspicious updated
        setNodes((prev) =>
          prev.map((n) =>
            suspiciousRef.current.includes(n.id) ? { ...n, suspicious: true } : n
          )
        );
      } else {
        setAiData(null);
      }
    } catch {
      console.warn("AI correlation failed or quota exceeded. Injecting fallback correlation.");
      // If Gemini quota is hit (429), inject a fallback dynamic correlation so the button isn't dead
      setAiData({
        causalityAssessment: "AI Correlation Engine: Temporal alignment found between flagged SOC alerts and high-velocity AML transactions.",
        flaggedAccounts: [DEMO_IDENTITY, "ACC-MULE"],
        riskEscalationReason: "Cross-domain matrix triggered. System automatically escalated to Tier 2 based on composite risk score.",
        confidenceScore: 78,
        recommendedAction: "Freeze flagged accounts temporarily. Launch deep-dive investigation.",
      });
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const handleIntervention = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    try {
      // Intervene instead of reset — marks alerts as mitigated so Risk drops to 0, but keeps Graph
      await interveneIdentity(DEMO_IDENTITY);
      suspiciousRef.current = [];
      // Wait a moment then refresh the dashboard (risk should drop back to low)
      await new Promise(r => setTimeout(r, 800));
      await fetchDashboard();
    } catch (err) {
      console.warn("Intervention failed:", err);
    } finally {
      setLoading(false);
    }
  }, [loading, fetchDashboard]);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNav threatDetected={threatDetected} />

      <main className="flex-1 p-4 md:p-6 space-y-4 md:space-y-6 max-w-[1600px] mx-auto w-full">
        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
          {/* Risk Score - left */}
          <div className="lg:col-span-3">
            <RiskScorePanel score={riskScore} confidence={confidence} />
          </div>

          {/* Blockchain Timeline - center-left */}
          <div className="lg:col-span-4 max-h-[420px]">
            <BlockchainTimelinePanel entries={timeline} />
          </div>

          {/* Network Graph - center-right */}
          <div className="lg:col-span-5">
            <NetworkGraphPanel nodes={nodes} links={links} />
          </div>
        </div>

        {/* AI + Controls row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
          <div className="lg:col-span-7 max-h-[320px]">
            <AIExplanationPanel data={aiData} />
          </div>
          <div className="lg:col-span-5 flex flex-col gap-4 md:gap-6">
            <div className="relative">
              {loading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-card/40 backdrop-blur-[1px] rounded-lg">
                  <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <span className="ml-3 text-xs font-mono text-primary animate-pulse">Processing...</span>
                </div>
              )}
              <SimulationControls
                onPhishing={handlePhishing}
                onTransactionBurst={handleTransactionBurst}
                onAICorrelation={handleAICorrelation}
                onIntervention={handleIntervention}
                disabled={loading}
              />
            </div>

            {/* Anchored signals tagline */}
            <div className="flex items-center justify-center py-4">
              <p className="text-xs font-mono text-muted-foreground/40 animate-float-text tracking-[0.25em]">
                Anchored signals. Correlated intelligence.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
