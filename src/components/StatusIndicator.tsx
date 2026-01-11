import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status: "online" | "warning" | "error" | "offline";
  label?: string;
  className?: string;
}

export function StatusIndicator({ status, label, className }: StatusIndicatorProps) {
  const statusColors = {
    online: "bg-success",
    warning: "bg-warning",
    error: "bg-error",
    offline: "bg-muted-foreground",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className={cn("h-2 w-2 rounded-full animate-pulse-glow", statusColors[status])} />
      {label && <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">{label}</span>}
    </div>
  );
}
