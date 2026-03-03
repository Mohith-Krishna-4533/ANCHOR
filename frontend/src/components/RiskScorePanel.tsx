import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface RiskScorePanelProps {
  score: number;
  confidence: number;
}

const RiskScorePanel = ({ score, confidence }: RiskScorePanelProps) => {
  const [displayScore, setDisplayScore] = useState(0);
  const isHighRisk = score > 70;

  useEffect(() => {
    const duration = 1200;
    const startTime = Date.now();
    const startScore = displayScore;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(startScore + (score - startScore) * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [score]);

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  const getScoreColor = () => {
    if (displayScore > 70) return "hsl(0, 72%, 51%)";
    if (displayScore > 40) return "hsl(38, 90%, 55%)";
    return "hsl(185, 80%, 48%)";
  };

  return (
    <div
      className={`bg-card panel-border rounded-lg p-6 flex flex-col items-center justify-center transition-shadow duration-700 ${
        isHighRisk ? "glow-red" : ""
      }`}
    >
      <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-6">
        Network Risk Score
      </p>

      <div className="relative w-48 h-48">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="hsl(220, 14%, 14%)"
            strokeWidth="6"
          />
          <motion.circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={getScoreColor()}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ filter: isHighRisk ? `drop-shadow(0 0 8px ${getScoreColor()})` : "none" }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.span
              key={displayScore}
              initial={{ opacity: 0.5, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-5xl font-semibold font-mono"
              style={{ color: getScoreColor() }}
            >
              {displayScore}
            </motion.span>
          </AnimatePresence>
          <span className="text-xs text-muted-foreground mt-1">/ 100</span>
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-xs text-muted-foreground font-mono">
          Confidence:{" "}
          <span className="text-accent">{confidence}%</span>
        </p>
      </div>
    </div>
  );
};

export default RiskScorePanel;
