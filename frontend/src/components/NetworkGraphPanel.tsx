import { useEffect, useRef } from "react";

export interface NetworkNode {
  id: string;
  label: string;
  suspicious: boolean;
  x: number;
  y: number;
}

export interface NetworkLink {
  source: string;
  target: string;
  highlighted?: boolean;
}

interface NetworkGraphPanelProps {
  nodes: NetworkNode[];
  links: NetworkLink[];
}

const NetworkGraphPanel = ({ nodes, links }: NetworkGraphPanelProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    let animationFrameId: number;
    let time = 0;

    const render = () => {
      ctx.clearRect(0, 0, w, h);
      time += 0.05;

      // Draw links
      links.forEach((link) => {
        const source = nodes.find((n) => n.id === link.source);
        const target = nodes.find((n) => n.id === link.target);
        if (!source || !target) return;

        const sx = source.x * w;
        const sy = source.y * h;
        const tx = target.x * w;
        const ty = target.y * h;

        const isSuspicious = source.suspicious || target.suspicious;
        const isHighlighted = link.highlighted;

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);

        if (isHighlighted) {
          ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
          ctx.lineWidth = 2.5;
        } else {
          ctx.strokeStyle = isSuspicious
            ? "hsla(0, 72%, 51%, 0.3)"
            : "hsla(220, 14%, 30%, 0.4)";
          ctx.lineWidth = isSuspicious ? 1.5 : 0.8;
          if (!isSuspicious) ctx.setLineDash([4, 4]); // dashed for normal links
        }

        ctx.stroke();
        ctx.setLineDash([]); // reset for nodes
      });

      // Draw nodes
      nodes.forEach((node) => {
        const nx = node.x * w;
        const ny = node.y * h;

        const isTargetOfHighlight = links.some(l => l.highlighted && (l.target === node.id || l.source === node.id));
        const radius = node.suspicious || isTargetOfHighlight ? 7 : 5;

        // Animated pulse for highlighted/newest nodes
        if (isTargetOfHighlight) {
          const pulseRadius = 14 + Math.sin(time) * 4;
          ctx.beginPath();
          ctx.arc(nx, ny, pulseRadius, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255, 0, 0, 0.25)";
          ctx.fill();
        } else if (node.suspicious) {
          ctx.beginPath();
          ctx.arc(nx, ny, 14, 0, Math.PI * 2);
          ctx.fillStyle = "hsla(0, 72%, 51%, 0.1)";
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(nx, ny, radius, 0, Math.PI * 2);
        ctx.fillStyle = isTargetOfHighlight
          ? "rgb(255, 50, 50)"
          : node.suspicious
            ? "hsl(0, 72%, 51%)"
            : "hsl(220, 10%, 40%)";
        ctx.fill();

        // Only draw labels for the most important nodes to reduce overlap clutter
        if (node.suspicious || isTargetOfHighlight) {
          ctx.fillStyle = isTargetOfHighlight
            ? "hsl(0, 72%, 70%)"
            : "hsl(0, 72%, 60%)";
          ctx.font = isTargetOfHighlight
            ? "bold 11px 'JetBrains Mono', monospace"
            : "10px 'JetBrains Mono', monospace";
          ctx.textAlign = "center";
          ctx.fillText(node.label, nx, ny + 20);
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [nodes, links]);

  return (
    <div className="bg-card panel-border rounded-lg p-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
          Network Graph
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-muted-foreground" />
            <span className="text-[10px] text-muted-foreground font-mono">Normal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-destructive" />
            <span className="text-[10px] text-muted-foreground font-mono">Suspicious</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[250px] relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ minHeight: "250px" }}
        />
      </div>
    </div>
  );
};

export default NetworkGraphPanel;
