import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  FileText,
  Timer,
  Zap,
} from "lucide-react";
import { useAllWebhookDeliveryLogs, WebhookDeliveryLog } from "@/hooks/useWebhookDeliveryLogs";
import { useWebhooks } from "@/hooks/useWebhooks";
import { formatDistanceToNow, format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

export function WebhookDeliveryLogs() {
  const { data: logs, isLoading } = useAllWebhookDeliveryLogs();
  const { data: webhooks } = useWebhooks();
  const [selectedLog, setSelectedLog] = useState<(WebhookDeliveryLog & { webhooks: { name: string } | null }) | null>(null);
  const [filterWebhook, setFilterWebhook] = useState<string>("all");

  const filteredLogs = logs?.filter((log) => 
    filterWebhook === "all" || log.webhook_id === filterWebhook
  );

  const getStatusColor = (status: number | null) => {
    if (!status) return "destructive";
    if (status >= 200 && status < 300) return "default";
    if (status >= 400 && status < 500) return "secondary";
    return "destructive";
  };

  const getStatusBadge = (status: number | null, success: boolean) => {
    if (success) {
      return (
        <Badge variant="default" className="bg-green-500/20 text-green-500 border-green-500/30 font-mono">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {status || "OK"}
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="font-mono">
        <XCircle className="h-3 w-3 mr-1" />
        {status || "ERR"}
      </Badge>
    );
  };

  const getResponseTimeColor = (ms: number | null) => {
    if (!ms) return "text-muted-foreground";
    if (ms < 200) return "text-green-500";
    if (ms < 500) return "text-yellow-500";
    if (ms < 1000) return "text-orange-500";
    return "text-destructive";
  };

  // Calculate stats
  const successCount = filteredLogs?.filter((l) => l.success).length || 0;
  const failureCount = filteredLogs?.filter((l) => !l.success).length || 0;
  const avgResponseTime = filteredLogs?.length
    ? Math.round(
        filteredLogs
          .filter((l) => l.response_time_ms)
          .reduce((acc, l) => acc + (l.response_time_ms || 0), 0) /
          (filteredLogs.filter((l) => l.response_time_ms).length || 1)
      )
    : 0;

  return (
    <>
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-mono flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Delivery Logs
              </CardTitle>
              <CardDescription>
                Recent webhook delivery attempts and their responses
              </CardDescription>
            </div>
            <Select value={filterWebhook} onValueChange={setFilterWebhook}>
              <SelectTrigger className="w-[200px] font-mono">
                <SelectValue placeholder="Filter by webhook" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Webhooks</SelectItem>
                {webhooks?.map((webhook) => (
                  <SelectItem key={webhook.id} value={webhook.id}>
                    {webhook.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 border border-border/50 rounded-lg bg-card">
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Successful
              </div>
              <div className="text-2xl font-bold font-mono text-green-500 mt-1">
                {successCount}
              </div>
            </div>
            <div className="p-4 border border-border/50 rounded-lg bg-card">
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
                <XCircle className="h-4 w-4 text-destructive" />
                Failed
              </div>
              <div className="text-2xl font-bold font-mono text-destructive mt-1">
                {failureCount}
              </div>
            </div>
            <div className="p-4 border border-border/50 rounded-lg bg-card">
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
                <Timer className="h-4 w-4" />
                Avg Response
              </div>
              <div className={`text-2xl font-bold font-mono mt-1 ${getResponseTimeColor(avgResponseTime)}`}>
                {avgResponseTime}ms
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !filteredLogs?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-mono">No delivery logs yet</p>
              <p className="text-sm mt-1">
                Logs will appear here when webhooks are triggered
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono">Webhook</TableHead>
                  <TableHead className="font-mono">Event</TableHead>
                  <TableHead className="font-mono">Status</TableHead>
                  <TableHead className="font-mono">Response Time</TableHead>
                  <TableHead className="font-mono">Attempted</TableHead>
                  <TableHead className="font-mono text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <span className="font-mono font-medium">
                        {log.webhooks?.name || "Unknown"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {log.event_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(log.response_status, log.success)}
                    </TableCell>
                    <TableCell>
                      {log.response_time_ms ? (
                        <div className={`flex items-center gap-1 font-mono ${getResponseTimeColor(log.response_time_ms)}`}>
                          <Zap className="h-3 w-3" />
                          {log.response_time_ms}ms
                        </div>
                      ) : (
                        <span className="text-muted-foreground font-mono">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground font-mono">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(log.attempted_at), {
                          addSuffix: true,
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                        className="font-mono"
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Log Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-mono flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Delivery Details
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground font-mono">Webhook</label>
                  <p className="font-mono font-medium">{selectedLog.webhooks?.name || "Unknown"}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground font-mono">Event</label>
                  <p>
                    <Badge variant="outline" className="font-mono">
                      {selectedLog.event_type}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground font-mono">Status</label>
                  <p>{getStatusBadge(selectedLog.response_status, selectedLog.success)}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground font-mono">Response Time</label>
                  <p className={`font-mono ${getResponseTimeColor(selectedLog.response_time_ms)}`}>
                    {selectedLog.response_time_ms ? `${selectedLog.response_time_ms}ms` : "—"}
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-muted-foreground font-mono">Attempted At</label>
                  <p className="font-mono">
                    {format(new Date(selectedLog.attempted_at), "PPpp")}
                  </p>
                </div>
              </div>

              {selectedLog.error_message && (
                <div>
                  <label className="text-sm text-muted-foreground font-mono">Error Message</label>
                  <div className="mt-1 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive font-mono">{selectedLog.error_message}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm text-muted-foreground font-mono">Request Payload</label>
                <ScrollArea className="h-32 mt-1">
                  <pre className="p-3 bg-muted rounded-lg text-xs font-mono overflow-x-auto">
                    {JSON.stringify(selectedLog.payload, null, 2)}
                  </pre>
                </ScrollArea>
              </div>

              {selectedLog.response_body && (
                <div>
                  <label className="text-sm text-muted-foreground font-mono">Response Body</label>
                  <ScrollArea className="h-32 mt-1">
                    <pre className="p-3 bg-muted rounded-lg text-xs font-mono overflow-x-auto">
                      {selectedLog.response_body}
                    </pre>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
