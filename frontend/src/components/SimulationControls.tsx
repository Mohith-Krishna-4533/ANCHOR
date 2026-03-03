import { motion } from "framer-motion";

interface SimulationControlsProps {
  onPhishing: () => void;
  onTransactionBurst: () => void;
  onAICorrelation: () => void;
  onIntervention: () => void;
  disabled?: boolean;
}

const buttons = [
  { key: "phishing", label: "Simulate Phishing Event", action: "onPhishing" },
  { key: "burst", label: "Simulate Transaction Burst", action: "onTransactionBurst" },
  { key: "ai", label: "Run AI Correlation", action: "onAICorrelation" },
  { key: "intervene", label: "Simulate Early Intervention", action: "onIntervention" },
] as const;

const SimulationControls = ({
  onPhishing,
  onTransactionBurst,
  onAICorrelation,
  onIntervention,
  disabled,
}: SimulationControlsProps) => {
  const actions = {
    onPhishing,
    onTransactionBurst,
    onAICorrelation,
    onIntervention,
  };

  return (
    <div className="bg-card panel-border rounded-lg p-6">
      <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4">
        Simulation Controls
      </p>

      <div className="flex flex-wrap gap-3">
        {buttons.map((btn) => (
          <motion.button
            key={btn.key}
            whileHover={disabled ? {} : { scale: 1.02 }}
            whileTap={disabled ? {} : { scale: 0.98 }}
            onClick={actions[btn.action]}
            disabled={disabled}
            className={`px-4 py-2.5 rounded-md text-xs font-mono tracking-wide 
              border transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-primary/40
              ${disabled
                ? 'bg-secondary/50 text-secondary-foreground/50 border-border/50 cursor-not-allowed'
                : 'bg-secondary text-secondary-foreground border-border hover:border-primary/50 hover:bg-secondary/80 active:glow-blue'
              }`}
          >
            {btn.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default SimulationControls;
