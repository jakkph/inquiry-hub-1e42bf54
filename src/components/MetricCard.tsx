import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function MetricCard({ label, value, subValue, trend, className }: MetricCardProps) {
  return (
    <div className={cn(
      "group relative overflow-hidden rounded-md border border-border bg-card p-4 transition-all duration-200 hover:border-primary/50",
      className
    )}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-2xl font-semibold text-foreground">{value}</span>
          {trend && (
            <span className={cn(
              "text-xs font-mono",
              trend === "up" && "text-success",
              trend === "down" && "text-error",
              trend === "neutral" && "text-muted-foreground"
            )}>
              {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
            </span>
          )}
        </div>
        {subValue && (
          <p className="font-mono text-xs text-muted-foreground mt-1">{subValue}</p>
        )}
      </div>
    </div>
  );
}
