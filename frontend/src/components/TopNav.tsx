import anchorSymbol from "@/assets/ANCHOR_1.png";

interface TopNavProps {
  threatDetected: boolean;
}

const TopNav = ({ threatDetected }: TopNavProps) => {
  return (
    <nav className="flex items-center justify-between px-6 py-4 panel-border border-t-0 border-x-0 bg-card/50 backdrop-blur-sm">
      <div className="flex-1" />

      <div className="flex items-center gap-3">
        <img src={anchorSymbol} alt="ANCHOR symbol" className="h-8 w-8" />
        <span className="text-2xl font-bold tracking-[0.3em] text-foreground" style={{ fontFamily: "'Arvo', serif" }}>
          ANCHOR
        </span>
      </div>

      <div className="flex-1 flex justify-end">
        <div className="flex items-center gap-2">
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              threatDetected
                ? "bg-destructive animate-pulse-glow"
                : "bg-success"
            }`}
          />
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            {threatDetected ? "Threat Detected" : "System Stable"}
          </span>
        </div>
      </div>
    </nav>
  );
};

export default TopNav;
