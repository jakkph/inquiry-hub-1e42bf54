import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SystemHeader } from "@/components/SystemHeader";
import { MetricCard } from "@/components/MetricCard";
import { TableDisplay } from "@/components/TableDisplay";
import { CodeBlock } from "@/components/CodeBlock";
import { StatusIndicator } from "@/components/StatusIndicator";
import { QueryHistoryPanel } from "@/components/QueryHistoryPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSectionTracking } from "@/hooks/useAnalytics";
import { useSaveQuery, QueryHistoryEntry } from "@/hooks/useQueryHistory";
import { useStrategicAnalysis, AnalysisResult } from "@/hooks/useStrategicAnalysis";
import { useLogAudit } from "@/hooks/useAuditLog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Save, Send, Loader2 } from "lucide-react";

const SAMPLE_PAYLOADS = {
  session_start: {
    event_type: "session_start",
    anonymized_token: "sha256_hash_of_fingerprint",
    entry_path: "/landing",
    referrer_type: "direct",
    attributes: { viewport_bucket: "large" }
  },
  scroll_depth: {
    event_type: "scroll_depth",
    session_id: "uuid-from-session-start",
    anonymized_token: "sha256_hash_of_fingerprint",
    page_path: "/article/privacy-first",
    depth: 75.5
  },
  section_dwell: {
    event_type: "section_dwell",
    session_id: "uuid-from-session-start",
    anonymized_token: "sha256_hash_of_fingerprint",
    section_id: "uuid-of-section",
    dwell_seconds: 45.2
  },
  rage_scroll: {
    event_type: "rage_scroll",
    session_id: "uuid-from-session-start",
    anonymized_token: "sha256_hash_of_fingerprint",
    page_path: "/checkout",
    rage_intensity: 7.5
  },
  contact_intent: {
    event_type: "contact_intent",
    session_id: "uuid-from-session-start",
    anonymized_token: "sha256_hash_of_fingerprint",
    raw_payload: { action: "form_focus" }
  }
};

const SCHEMA_OVERVIEW = [
  { table: "sessions", records: "-", purpose: "Session tracking with anonymized tokens" },
  { table: "events", records: "-", purpose: "All event types with validated payloads" },
  { table: "sections", records: "-", purpose: "Page sections for dwell tracking" },
  { table: "session_metrics", records: "-", purpose: "Aggregated session-level metrics" },
  { table: "coherence_scores", records: "-", purpose: "Server-computed engagement scores" },
  { table: "event_definitions", records: "8", purpose: "Event schemas and validation rules" },
  { table: "privacy_audit", records: "-", purpose: "Rejected/suspicious payload log" },
];

const EVENT_DEFINITIONS = [
  { type: "session_start", required: "entry_path", bounds: "-" },
  { type: "scroll_depth", required: "depth", bounds: "0-100" },
  { type: "section_dwell", required: "section_id, dwell_seconds", bounds: "dwell: 0-3600" },
  { type: "pause_event", required: "pause_seconds", bounds: "0-300" },
  { type: "exit_event", required: "-", bounds: "-" },
  { type: "rage_scroll", required: "rage_intensity", bounds: "0-10" },
  { type: "early_exit", required: "-", bounds: "-" },
  { type: "contact_intent", required: "-", bounds: "-" },
];

export default function Index() {
  const [currentTime, setCurrentTime] = useState(new Date().toISOString());
  const [queryInput, setQueryInput] = useState("");
  const [displayedResult, setDisplayedResult] = useState<AnalysisResult | null>(null);
  const [selectedQuery, setSelectedQuery] = useState<QueryHistoryEntry | null>(null);
  
  const { user } = useAuth();
  const saveQuery = useSaveQuery();
  const { analyze, isLoading } = useStrategicAnalysis();
  const logAudit = useLogAudit();

  // Section tracking refs for dwell time measurement
  const metricsRef = useSectionTracking("index_metrics");
  const schemaRef = useSectionTracking("index_schema");
  const eventsRef = useSectionTracking("index_events");
  const payloadsRef = useSectionTracking("index_payloads");
  const notesRef = useSectionTracking("index_notes");

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date().toISOString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmitQuery = async () => {
    if (!queryInput.trim() || isLoading) return;
    
    setSelectedQuery(null);
    
    // Log the query submission
    if (user) {
      logAudit.mutate({
        action: "query_submitted",
        resourceType: "strategic_analysis",
        details: { query_length: queryInput.length },
      });
    }

    const result = await analyze(queryInput);
    
    if (result) {
      setDisplayedResult(result);
      
      // Save query if authenticated
      if (user) {
        saveQuery.mutate({
          query_input: queryInput,
          response_signal: result.signal,
          response_constraint: result.constraint,
          response_structural_risk: result.structural_risk,
          response_strategic_vector: result.strategic_vector,
          response_diagnostics: result.diagnostics,
          status: "complete",
        }, {
          onSuccess: () => {
            toast.success("Query archived.");
          },
          onError: () => {
            toast.error("Archive failed.");
          }
        });
      }
    }
  };

  const handleSelectQuery = (query: QueryHistoryEntry) => {
    setSelectedQuery(query);
    setQueryInput(query.query_input);
    
    if (query.status === "complete" && query.response_signal) {
      setDisplayedResult({
        signal: query.response_signal,
        constraint: query.response_constraint || "",
        structural_risk: query.response_structural_risk || "",
        strategic_vector: query.response_strategic_vector || "",
        diagnostics: (query.response_diagnostics as AnalysisResult["diagnostics"]) || {
          confidence: 0,
          analysis_depth: "surface",
          secondary_effects: []
        }
      });
    } else {
      setDisplayedResult(null);
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      <SystemHeader systemStatus="online" version="v1.0.0" />
      
      <main className="container py-8 space-y-8">
        {/* Status Banner */}
        <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusIndicator status="online" />
              <div>
                <p className="font-mono text-sm text-foreground">System initialized. Awaiting input.</p>
                <p className="font-mono text-xs text-muted-foreground mt-1">
                  Strategic analysis powered by Gemini 2.5 Flash.
                </p>
              </div>
            </div>
            <Link to="/dashboard">
              <Button variant="outline" size="sm" className="font-mono text-xs">
                View Analytics →
              </Button>
            </Link>
          </div>
        </div>

        {/* Query Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="border border-border rounded-md bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  Strategic Query Interface
                </h2>
                {user && (
                  <span className="font-mono text-[10px] text-signal-nominal flex items-center gap-1">
                    <Save className="h-3 w-3" />
                    Auto-archive enabled
                  </span>
                )}
              </div>
              
              <Textarea
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="Enter strategic problem, constraint, or system state for analysis..."
                className="font-mono text-sm bg-secondary/30 border-border min-h-[120px] resize-none"
                disabled={isLoading}
              />
              
              <div className="flex items-center justify-between mt-4">
                <p className="font-mono text-[10px] text-muted-foreground">
                  {queryInput.length} characters
                </p>
                <Button
                  onClick={handleSubmitQuery}
                  disabled={!queryInput.trim() || isLoading}
                  className="font-mono text-xs gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Send className="h-3 w-3" />
                      Process Query
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Response Display */}
            {displayedResult && (
              <div className="border border-primary/30 rounded-md bg-card/50 p-6 space-y-6">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-signal-nominal animate-pulse" />
                  <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    Analysis Complete
                  </span>
                  {displayedResult.diagnostics?.confidence && (
                    <span className="ml-auto font-mono text-[10px] text-primary">
                      Confidence: {(displayedResult.diagnostics.confidence * 100).toFixed(0)}%
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="border-l-2 border-primary pl-4">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-primary">Signal</span>
                    <p className="font-mono text-sm text-foreground mt-1">
                      {displayedResult.signal}
                    </p>
                  </div>

                  <div className="border-l-2 border-signal-warning pl-4">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-signal-warning">Constraint</span>
                    <p className="font-mono text-sm text-foreground mt-1">
                      {displayedResult.constraint}
                    </p>
                  </div>

                  <div className="border-l-2 border-signal-critical pl-4">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-signal-critical">Structural Risk</span>
                    <p className="font-mono text-sm text-foreground mt-1">
                      {displayedResult.structural_risk}
                    </p>
                  </div>

                  <div className="border-l-2 border-signal-nominal pl-4">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-signal-nominal">Strategic Vector</span>
                    <p className="font-mono text-sm text-foreground mt-1">
                      {displayedResult.strategic_vector}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Diagnostics</span>
                  <CodeBlock
                    title="System Metadata"
                    code={JSON.stringify(displayedResult.diagnostics, null, 2)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Query History Sidebar */}
          <div className="lg:col-span-1">
            <QueryHistoryPanel onSelectQuery={handleSelectQuery} />
          </div>
        </div>

        {/* Metrics Grid */}
        <section ref={metricsRef as React.RefObject<HTMLElement>}>
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">System Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Tables Active" value="7" subValue="RLS enabled" />
            <MetricCard label="Event Types" value="8" subValue="canonical" />
            <MetricCard label="Views" value="5" subValue="aggregated" />
            <MetricCard label="Functions" value="3" subValue="security definer" />
          </div>
        </section>

        {/* Schema Overview */}
        <section ref={schemaRef as React.RefObject<HTMLElement>}>
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">Schema Overview</h2>
          <TableDisplay
            columns={[
              { key: "table", label: "Table" },
              { key: "records", label: "Records", align: "right" },
              { key: "purpose", label: "Purpose" },
            ]}
            data={SCHEMA_OVERVIEW}
          />
        </section>

        {/* Event Definitions */}
        <section ref={eventsRef as React.RefObject<HTMLElement>}>
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">Event Definitions</h2>
          <TableDisplay
            columns={[
              { key: "type", label: "Event Type" },
              { key: "required", label: "Required Fields" },
              { key: "bounds", label: "Numeric Bounds" },
            ]}
            data={EVENT_DEFINITIONS}
          />
        </section>

        {/* Sample Payloads */}
        <section ref={payloadsRef as React.RefObject<HTMLElement>}>
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">Sample Payloads</h2>
          <Tabs defaultValue="session_start" className="w-full">
            <TabsList className="bg-secondary/50 border border-border">
              {Object.keys(SAMPLE_PAYLOADS).map((key) => (
                <TabsTrigger 
                  key={key} 
                  value={key}
                  className="font-mono text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {key}
                </TabsTrigger>
              ))}
            </TabsList>
            {Object.entries(SAMPLE_PAYLOADS).map(([key, payload]) => (
              <TabsContent key={key} value={key} className="mt-4">
                <CodeBlock
                  title={`POST /functions/v1/ingest`}
                  code={JSON.stringify(payload, null, 2)}
                />
              </TabsContent>
            ))}
          </Tabs>
        </section>

        {/* Implementation Notes */}
        <section ref={notesRef as React.RefObject<HTMLElement>} className="border border-border rounded-md bg-card p-6">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">Implementation Notes</h2>
          <div className="space-y-4 font-mono text-xs text-foreground/80">
            <div className="flex gap-4">
              <span className="text-primary">01</span>
              <p>Generate <code className="bg-secondary px-1.5 py-0.5 rounded">anonymized_token</code> client-side using SHA-256 of non-reversible fingerprint (canvas hash, timezone, screen dimensions).</p>
            </div>
            <div className="flex gap-4">
              <span className="text-primary">02</span>
              <p>Call <code className="bg-secondary px-1.5 py-0.5 rounded">session_start</code> first to obtain <code className="bg-secondary px-1.5 py-0.5 rounded">session_id</code>. All subsequent events require this ID.</p>
            </div>
            <div className="flex gap-4">
              <span className="text-primary">03</span>
              <p>PII detection runs on all payloads. Email, phone, SSN, IP, and MAC patterns trigger immediate rejection.</p>
            </div>
            <div className="flex gap-4">
              <span className="text-primary">04</span>
              <p>Rate limit: 100 requests/minute per token. 429 response includes <code className="bg-secondary px-1.5 py-0.5 rounded">code: E002</code>.</p>
            </div>
            <div className="flex gap-4">
              <span className="text-primary">05</span>
              <p>Coherence scores computed server-side only. No client exposure. Access restricted to service_role.</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border pt-6 flex items-center justify-between">
          <p className="font-mono text-[10px] text-muted-foreground">
            STRATUM · STRATEGIC ANALYSIS SYSTEM
          </p>
          <p className="font-mono text-[10px] text-muted-foreground">
            {currentTime.replace("T", " ").slice(0, 19)} UTC
          </p>
        </footer>
      </main>
    </div>
  );
}
