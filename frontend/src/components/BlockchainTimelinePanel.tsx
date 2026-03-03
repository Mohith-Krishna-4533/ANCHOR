import { motion, AnimatePresence } from "framer-motion";

export interface TimelineEntry {
  id: string;
  blockNumber: number;
  institution: string;
  timestamp: string;
  hash: string;
  type: "SOC" | "AML";
}

interface BlockchainTimelinePanelProps {
  entries: TimelineEntry[];
}

const shortenHash = (hash: string) => {
  if (hash.length <= 10) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
};

const BlockchainTimelinePanel = ({ entries }: BlockchainTimelinePanelProps) => {
  return (
    <div className="bg-card panel-border rounded-lg p-6 flex flex-col h-full">
      <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4">
        Blockchain Timeline
      </p>

      <div className="flex-1 overflow-y-auto space-y-0 pr-1 relative">
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

        {entries.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground font-mono text-xs opacity-50">
            No events recorded yet.
          </div>
        ) : (
          <AnimatePresence>
            {entries.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative pl-8 py-3"
              >
                <div
                  className={`absolute left-[7px] top-[18px] h-2.5 w-2.5 rounded-sm border ${entry.type === "SOC"
                      ? "border-primary bg-primary/30"
                      : "border-warning bg-warning/30"
                    }`}
                />

                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${entry.type === "SOC"
                          ? "bg-primary/10 text-primary"
                          : "bg-warning/10 text-warning"
                        }`}>
                        {entry.type}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        Block #{entry.blockNumber}
                      </span>
                    </div>
                    <p className="text-sm text-card-foreground">
                      {entry.institution}
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                      {shortenHash(entry.hash)}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                    {entry.timestamp}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default BlockchainTimelinePanel;
