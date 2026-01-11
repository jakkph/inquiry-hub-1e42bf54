import { StatusIndicator } from "./StatusIndicator";
import { OperatorHeader } from "./OperatorHeader";
import { NotificationBell } from "./NotificationBell";
import { useAuth } from "@/contexts/AuthContext";

interface SystemHeaderProps {
  systemStatus: "online" | "warning" | "error" | "offline";
  version: string;
}

export function SystemHeader({ systemStatus, version }: SystemHeaderProps) {
  const currentTime = new Date().toISOString().replace("T", " ").slice(0, 19);
  const { user } = useAuth();

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="container flex items-center justify-between py-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-primary/20 flex items-center justify-center">
              <span className="font-mono text-primary text-sm font-bold">S</span>
            </div>
            <div>
              <h1 className="font-mono text-sm font-semibold text-foreground tracking-tight">STRATUM</h1>
              <p className="font-mono text-[10px] text-muted-foreground">{version}</p>
            </div>
          </div>
          <div className="h-6 w-px bg-border" />
          <StatusIndicator status={systemStatus} label="System" />
        </div>
        
        <div className="flex items-center gap-6">
          <div className="font-mono text-xs text-muted-foreground">
            <span className="text-foreground/60">UTC:</span> {currentTime}
          </div>
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
            <span className="font-mono text-[10px] text-muted-foreground uppercase">Live</span>
          </div>
          <div className="h-6 w-px bg-border" />
          {user && <NotificationBell />}
          <OperatorHeader />
        </div>
      </div>
    </header>
  );
}
