import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield, AlertTriangle, Clock, FileWarning, CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { usePrivacyAudit, usePrivacyAuditStats, DateRange } from "@/hooks/usePrivacyAudit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getRejectionBadgeVariant(reason: string): "default" | "secondary" | "destructive" | "outline" {
  if (reason.includes("pii") || reason.includes("PII")) return "destructive";
  if (reason.includes("invalid") || reason.includes("validation")) return "secondary";
  if (reason.includes("rate")) return "outline";
  return "default";
}

export default function PrivacyAudit() {
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const { data: auditLogs, isLoading, error } = usePrivacyAudit(100, dateRange);
  const { data: stats } = usePrivacyAuditStats();

  const clearFilters = () => {
    setDateRange({ from: undefined, to: undefined });
  };

  const hasFilters = dateRange.from || dateRange.to;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-semibold">Privacy Audit Log</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Last 24 Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">
                {stats?.last24h ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">rejected payloads</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Last 7 Days
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-500">
                {stats?.last7d ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">rejected payloads</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileWarning className="h-4 w-4" />
                Top Reason
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.byReason && Object.keys(stats.byReason).length > 0 ? (
                <>
                  <p className="text-lg font-semibold truncate">
                    {Object.entries(stats.byReason).sort((a, b) => b[1] - a[1])[0]?.[0] || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Object.entries(stats.byReason).sort((a, b) => b[1] - a[1])[0]?.[1] || 0} occurrences
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">No rejections</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Rejection Reason Breakdown */}
        {stats?.byReason && Object.keys(stats.byReason).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rejection Reasons (7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.byReason)
                  .sort((a, b) => b[1] - a[1])
                  .map(([reason, count]) => (
                    <Badge
                      key={reason}
                      variant={getRejectionBadgeVariant(reason)}
                      className="text-xs"
                    >
                      {reason}: {count}
                    </Badge>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Date Range Filters */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Filter by Date Range</CardTitle>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1">
                  <X className="h-3 w-3" />
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">From</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[180px] justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? format(dateRange.from, "PPP") : "Start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => setDateRange((prev) => ({ ...prev, from: date }))}
                      disabled={(date) => date > new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">To</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[180px] justify-start text-left font-normal",
                        !dateRange.to && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.to ? format(dateRange.to, "PPP") : "End date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => setDateRange((prev) => ({ ...prev, to: date }))}
                      disabled={(date) => date > new Date() || (dateRange.from && date < dateRange.from)}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Audit Log Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Recent Audit Entries</span>
              {auditLogs && (
                <span className="text-sm font-normal text-muted-foreground">
                  {auditLogs.length} results
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                Loading audit logs...
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-8 text-destructive">
                Failed to load audit logs
              </div>
            ) : auditLogs && auditLogs.length > 0 ? (
              <ScrollArea className="h-[500px]">
                <Accordion type="single" collapsible className="space-y-2">
                  {auditLogs.map((entry) => (
                    <AccordionItem
                      key={entry.audit_id}
                      value={entry.audit_id}
                      className="border rounded-lg px-4"
                    >
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex items-center gap-4 text-left w-full">
                          <span className="text-xs text-muted-foreground font-mono w-32 shrink-0">
                            {formatDate(entry.created_at)}
                          </span>
                          <Badge
                            variant={getRejectionBadgeVariant(entry.rejection_reason)}
                            className="shrink-0"
                          >
                            {entry.rejection_reason}
                          </Badge>
                          {entry.event_type && (
                            <span className="text-sm text-muted-foreground">
                              {entry.event_type}
                            </span>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pb-2">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground text-xs mb-1">Token Hash</p>
                              <p className="font-mono text-xs truncate">
                                {entry.anonymized_token || "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs mb-1">IP Hash</p>
                              <p className="font-mono text-xs truncate">
                                {entry.source_ip_hash || "—"}
                              </p>
                            </div>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">
                              Sanitized Payload
                            </p>
                            <pre className="bg-muted p-3 rounded text-xs overflow-x-auto font-mono">
                              {JSON.stringify(entry.sanitized_payload, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Shield className="h-12 w-12 mb-4 opacity-50" />
                <p>No rejected payloads</p>
                <p className="text-sm">
                  {hasFilters ? "Try adjusting your date range" : "All incoming data passed validation"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
