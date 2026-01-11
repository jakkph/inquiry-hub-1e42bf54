import { useQueryHistory, useDeleteQuery, QueryHistoryEntry } from "@/hooks/useQueryHistory";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Clock, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface QueryHistoryPanelProps {
  onSelectQuery?: (query: QueryHistoryEntry) => void;
}

export function QueryHistoryPanel({ onSelectQuery }: QueryHistoryPanelProps) {
  const { user } = useAuth();
  const { data: queries, isLoading } = useQueryHistory();
  const deleteQuery = useDeleteQuery();

  if (!user) {
    return (
      <div className="border border-border rounded-md bg-card p-6">
        <p className="font-mono text-xs text-muted-foreground text-center">
          Authenticate to access query archive.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="border border-border rounded-md bg-card p-6">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="font-mono text-xs text-muted-foreground">Loading archive...</span>
        </div>
      </div>
    );
  }

  if (!queries?.length) {
    return (
      <div className="border border-border rounded-md bg-card p-6">
        <p className="font-mono text-xs text-muted-foreground text-center">
          No queries archived. Submit a query to begin.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-md bg-card">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Query Archive
        </h3>
        <p className="font-mono text-[10px] text-muted-foreground/60 mt-1">
          {queries.length} stored queries
        </p>
      </div>
      
      <ScrollArea className="h-[300px]">
        <div className="divide-y divide-border">
          {queries.map((query) => (
            <div
              key={query.id}
              className="p-4 hover:bg-secondary/30 transition-colors group cursor-pointer"
              onClick={() => onSelectQuery?.(query)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs text-foreground truncate">
                    {query.query_input.slice(0, 80)}
                    {query.query_input.length > 80 && "..."}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`
                      font-mono text-[10px] px-1.5 py-0.5 rounded
                      ${query.status === "complete" 
                        ? "bg-signal-nominal/20 text-signal-nominal" 
                        : query.status === "pending"
                        ? "bg-signal-warning/20 text-signal-warning"
                        : "bg-secondary text-muted-foreground"
                      }
                    `}>
                      {query.status.toUpperCase()}
                    </span>
                    <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(query.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-signal-critical"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteQuery.mutate(query.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
