import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SystemHeader } from "@/components/SystemHeader";
import { MetricCard } from "@/components/MetricCard";
import { TableDisplay } from "@/components/TableDisplay";
import { CodeBlock } from "@/components/CodeBlock";
import { StatusIndicator } from "@/components/StatusIndicator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useSectionTracking } from "@/hooks/useAnalytics";

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

  return (
    <div className="min-h-screen bg-background font-sans">
      <SystemHeader systemStatus="online" version="v1.0.0-day6" />
      
      <main className="container py-8 space-y-8">
        {/* Status Banner */}
        <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StatusIndicator status="online" />
              <div>
                <p className="font-mono text-sm text-foreground">System initialized. Awaiting ingestion events.</p>
                <p className="font-mono text-xs text-muted-foreground mt-1">
                  Endpoint: POST /functions/v1/ingest
                </p>
              </div>
            </div>
            <Link to="/dashboard">
              <Button variant="outline" size="sm" className="font-mono text-xs">
                View Dashboard →
              </Button>
            </Link>
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
            PRIVACY-FIRST ANALYTICS SYSTEM · DAY 6 MIGRATION
          </p>
          <p className="font-mono text-[10px] text-muted-foreground">
            {currentTime.replace("T", " ").slice(0, 19)} UTC
          </p>
        </footer>
      </main>
    </div>
  );
}
