import { motion } from "framer-motion";

export interface AIExplanation {
  causalityAssessment: string;
  flaggedAccounts: string[];
  riskEscalationReason: string;
  confidenceScore: number;
  recommendedAction: string;
}

interface AIExplanationPanelProps {
  data: AIExplanation | null;
}

const AIExplanationPanel = ({ data }: AIExplanationPanelProps) => {
  return (
    <div className="bg-card panel-border rounded-lg p-6 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
          AI Correlation Output
        </p>
        <span className="text-[10px] font-mono text-accent/60">
          Gemini
        </span>
      </div>

      {data ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="flex-1 overflow-y-auto"
        >
          <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap">
            <span className="text-muted-foreground">{"{\n"}</span>
            <Field label="causality_assessment" value={`"${data.causalityAssessment}"`} color="accent" />
            <Field
              label="flagged_accounts"
              value={`[${data.flaggedAccounts.map((a) => `"${a}"`).join(", ")}]`}
              color="destructive"
            />
            <Field label="risk_escalation_reason" value={`"${data.riskEscalationReason}"`} color="accent" />
            <Field label="confidence_score" value={`${data.confidenceScore}`} color="accent" isNumber />
            <Field label="recommended_action" value={`"${data.recommendedAction}"`} color="warning" last />
            <span className="text-muted-foreground">{"}"}</span>
          </pre>
        </motion.div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-muted-foreground font-mono italic">
            Awaiting AI correlation...
          </p>
        </div>
      )}
    </div>
  );
};

const Field = ({
  label,
  value,
  color,
  isNumber,
  last,
}: {
  label: string;
  value: string;
  color: string;
  isNumber?: boolean;
  last?: boolean;
}) => (
  <span>
    {"  "}
    <span className="text-muted-foreground">"{label}"</span>
    <span className="text-muted-foreground">: </span>
    <span className={`text-${color}`}>
      {value}
    </span>
    {!last && <span className="text-muted-foreground">,</span>}
    {"\n"}
  </span>
);

export default AIExplanationPanel;
