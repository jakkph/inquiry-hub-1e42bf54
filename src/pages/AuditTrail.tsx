import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { SystemHeader } from "@/components/SystemHeader";
import { useAuditLogs, AuditLogEntry } from "@/hooks/useAuditLog";
import { useIsAdmin } from "@/hooks/useUserRoles";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow, format } from "date-fns";
import { Shield, Search, Filter, User, Clock, Activity } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const actionColors: Record<string, string> = {
  query_submitted: "bg-primary/10 text-primary border-primary/20",
  login: "bg-signal-nominal/10 text-signal-nominal border-signal-nominal/20",
  logout: "bg-muted text-muted-foreground border-border",
  data_export: "bg-signal-warning/10 text-signal-warning border-signal-warning/20",
  settings_changed: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

function AuditLogItem({ log }: { log: AuditLogEntry }) {
  const details = typeof log.details === 'object' && log.details !== null ? log.details : {};
  
  return (
    <div className="p-4 border-b border-border hover:bg-card/50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={actionColors[log.action] || "bg-secondary text-foreground border-border"}
              >
                {log.action.replace(/_/g, " ")}
              </Badge>
              <span className="font-mono text-xs text-muted-foreground">
                on {log.resource_type}
              </span>
              {log.resource_id && (
                <code className="font-mono text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">
                  {log.resource_id}
                </code>
              )}
            </div>
            
            {Object.keys(details).length > 0 && (
              <pre className="font-mono text-[10px] text-muted-foreground mt-2 bg-secondary/50 p-2 rounded overflow-x-auto">
                {JSON.stringify(details, null, 2)}
              </pre>
            )}
            
            {log.user_agent && (
              <p className="font-mono text-[10px] text-muted-foreground/50 mt-1 truncate">
                {log.user_agent.slice(0, 80)}...
              </p>
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span className="font-mono text-[10px]">
              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
            </span>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground/50">
            {format(new Date(log.created_at), "HH:mm:ss")}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AuditTrail() {
  const { user, loading: authLoading } = useAuth();
  const { hasRole: isAdmin, isLoading: roleLoading } = useIsAdmin();
  const { data: logs, isLoading: logsLoading } = useAuditLogs(200);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");

  // Loading state
  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="font-mono text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background font-sans">
        <SystemHeader systemStatus="online" version="v1.0.0" />
        <main className="container py-8">
          <div className="flex flex-col items-center justify-center py-20">
            <Shield className="h-12 w-12 text-signal-critical mb-4" />
            <h1 className="font-mono text-lg text-foreground mb-2">Access Denied</h1>
            <p className="font-mono text-sm text-muted-foreground mb-6">
              Admin privileges required to view audit logs.
            </p>
            <Link to="/">
              <Button variant="outline" className="font-mono text-xs">
                ← Return to System Overview
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Get unique actions for filter
  const uniqueActions = logs
    ? [...new Set(logs.map((log) => log.action))]
    : [];

  // Filter logs
  const filteredLogs = logs?.filter((log) => {
    const matchesSearch =
      searchTerm === "" ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    
    return matchesSearch && matchesAction;
  });

  return (
    <div className="min-h-screen bg-background font-sans">
      <SystemHeader systemStatus="online" version="v1.0.0" />
      
      <main className="container py-8 space-y-6">
        {/* Navigation */}
        <nav className="flex items-center gap-4">
          <Link 
            to="/" 
            className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← System Overview
          </Link>
          <span className="text-border">|</span>
          <span className="font-mono text-xs text-primary">Audit Trail</span>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded bg-signal-warning/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-signal-warning" />
            </div>
            <div>
              <h1 className="font-mono text-sm font-semibold text-foreground">Audit Trail</h1>
              <p className="font-mono text-[10px] text-muted-foreground">
                {logs?.length || 0} events recorded
              </p>
            </div>
          </div>
          
          <Badge variant="outline" className="font-mono text-[10px]">
            <User className="h-3 w-3 mr-1" />
            Admin View
          </Badge>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 font-mono text-xs bg-secondary/30"
            />
          </div>
          
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-48 font-mono text-xs">
              <Filter className="h-3 w-3 mr-2" />
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-mono text-xs">All Actions</SelectItem>
              {uniqueActions.map((action) => (
                <SelectItem key={action} value={action} className="font-mono text-xs">
                  {action.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Logs List */}
        <div className="border border-border rounded-md bg-card">
          <div className="p-3 border-b border-border bg-secondary/30">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Activity Log
            </span>
          </div>
          
          {logsLoading ? (
            <div className="p-8 text-center">
              <p className="font-mono text-xs text-muted-foreground">Loading audit logs...</p>
            </div>
          ) : filteredLogs && filteredLogs.length > 0 ? (
            <ScrollArea className="h-[600px]">
              {filteredLogs.map((log) => (
                <AuditLogItem key={log.id} log={log} />
              ))}
            </ScrollArea>
          ) : (
            <div className="p-8 text-center">
              <Activity className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="font-mono text-xs text-muted-foreground">
                {searchTerm || actionFilter !== "all"
                  ? "No logs match your filters"
                  : "No audit logs recorded yet"}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
