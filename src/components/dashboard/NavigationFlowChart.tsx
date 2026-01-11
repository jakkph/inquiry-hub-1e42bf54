import { useNavigationFlow } from "@/hooks/useAnalyticsData";
import { cn } from "@/lib/utils";

export function NavigationFlowChart() {
  const { data, isLoading, error } = useNavigationFlow();

  if (isLoading) {
    return (
      <div className="rounded-md border border-border bg-card p-6">
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">Navigation Flow</h3>
        <div className="h-80 flex items-center justify-center">
          <span className="font-mono text-xs text-muted-foreground animate-pulse">Loading...</span>
        </div>
      </div>
    );
  }

  if (error || !data || data.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card p-6">
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">Navigation Flow</h3>
        <div className="h-80 flex items-center justify-center">
          <span className="font-mono text-xs text-muted-foreground">No navigation flow data available</span>
        </div>
      </div>
    );
  }

  // Get unique pages
  const fromPages = [...new Set(data.map(d => d.from_page))];
  const toPages = [...new Set(data.map(d => d.to_page))];
  const maxCount = Math.max(...data.map(d => Number(d.transition_count)));

  return (
    <div className="rounded-md border border-border bg-card p-6">
      <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">Navigation Flow (Top 20)</h3>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {data.map((flow, index) => {
          const intensity = Number(flow.transition_count) / maxCount;
          return (
            <div 
              key={index}
              className="flex items-center gap-3 p-2 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-foreground truncate max-w-[120px]" title={flow.from_page}>
                    {flow.from_page || "/"}
                  </span>
                  <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <span className="font-mono text-xs text-foreground truncate max-w-[120px]" title={flow.to_page}>
                    {flow.to_page || "/"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div 
                  className="h-1.5 rounded-full bg-primary"
                  style={{ width: `${Math.max(intensity * 60, 8)}px`, opacity: 0.3 + intensity * 0.7 }}
                />
                <span className="font-mono text-xs text-muted-foreground w-8 text-right">
                  {flow.transition_count}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-muted-foreground">
            {fromPages.length} source pages → {toPages.length} destinations
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {data.reduce((sum, d) => sum + Number(d.transition_count), 0)} total transitions
          </span>
        </div>
      </div>
    </div>
  );
}
