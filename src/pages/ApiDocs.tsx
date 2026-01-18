import { useState } from "react";
import { SystemHeader } from "@/components/SystemHeader";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CodeBlock } from "@/components/CodeBlock";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Play,
  Copy,
  Check,
  Loader2,
  Zap,
  Shield,
  Database,
  AlertTriangle,
  Terminal,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EndpointConfig {
  name: string;
  method: "POST" | "GET";
  path: string;
  description: string;
  requiresAuth: boolean;
  requestBody: object;
  responseExample: object;
  errorCodes: { code: string; description: string }[];
}

const ENDPOINTS: EndpointConfig[] = [
  {
    name: "Strategic Analysis",
    method: "POST",
    path: "/functions/v1/strategic-analysis",
    description:
      "AI-powered strategic analysis using Gemini 2.5 Flash. Analyzes strategic problems and returns structured insights including signals, constraints, risks, and recommended actions.",
    requiresAuth: true,
    requestBody: {
      query: "Analyze the market dynamics of renewable energy sector in 2025",
    },
    responseExample: {
      signal: "Accelerating adoption driven by policy incentives and cost parity",
      constraint: "Grid infrastructure lagging behind generation capacity",
      structural_risk: "Supply chain concentration in critical minerals",
      strategic_vector: "Invest in grid modernization and storage solutions",
      diagnostics: {
        confidence: 0.85,
        analysis_depth: "structural",
        secondary_effects: [
          "job_market_shift",
          "geopolitical_realignment",
          "capital_reallocation",
        ],
      },
    },
    errorCodes: [
      { code: "400", description: "Query is required and must be a string" },
      { code: "402", description: "AI credits exhausted" },
      { code: "429", description: "Rate limit exceeded" },
      { code: "500", description: "AI service error" },
    ],
  },
  {
    name: "Event Ingestion",
    method: "POST",
    path: "/functions/v1/ingest",
    description:
      "Ingest analytics events with built-in PII detection, rate limiting, and validation. Supports session management and various event types.",
    requiresAuth: false,
    requestBody: {
      event_type: "session_start",
      anonymized_token: "abc123def456",
      entry_path: "/",
      referrer_type: "direct",
      attributes: {},
    },
    responseExample: {
      status: "accepted",
      session_id: "uuid-session-id",
      event_type: "session_start",
    },
    errorCodes: [
      { code: "E001", description: "Missing required fields" },
      { code: "E002", description: "Rate limited (100 req/min)" },
      { code: "E003", description: "Unknown event type" },
      { code: "E004", description: "Validation failed - missing field" },
      { code: "E005", description: "Numeric bounds violation" },
      { code: "E006", description: "PII detected in payload" },
      { code: "E007", description: "Session creation failed" },
      { code: "E008", description: "Session ID required for non-start events" },
    ],
  },
];

const EVENT_TYPES = [
  {
    type: "session_start",
    description: "Initialize a new tracking session",
    requiredFields: ["anonymized_token", "entry_path"],
  },
  {
    type: "page_view",
    description: "Track page navigation",
    requiredFields: ["session_id", "page_path"],
  },
  {
    type: "scroll_depth",
    description: "Track scroll progress",
    requiredFields: ["session_id", "depth"],
  },
  {
    type: "section_dwell",
    description: "Track time spent on sections",
    requiredFields: ["session_id", "section_id", "dwell_seconds"],
  },
  {
    type: "rage_scroll",
    description: "Detect frustration patterns",
    requiredFields: ["session_id", "rage_intensity"],
  },
  {
    type: "read_pause",
    description: "Track reading pauses",
    requiredFields: ["session_id", "pause_seconds"],
  },
];

export default function ApiDocs() {
  const [activeEndpoint, setActiveEndpoint] = useState(0);
  const [requestBody, setRequestBody] = useState(
    JSON.stringify(ENDPOINTS[0].requestBody, null, 2)
  );
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const currentEndpoint = ENDPOINTS[activeEndpoint];

  const handleEndpointChange = (index: number) => {
    setActiveEndpoint(index);
    setRequestBody(JSON.stringify(ENDPOINTS[index].requestBody, null, 2));
    setResponse(null);
  };

  const handleExecute = async () => {
    setIsLoading(true);
    setResponse(null);

    try {
      const body = JSON.parse(requestBody);
      const { data, error } = await supabase.functions.invoke(
        currentEndpoint.path.replace("/functions/v1/", ""),
        { body }
      );

      if (error) {
        setResponse(JSON.stringify({ error: error.message }, null, 2));
      } else {
        setResponse(JSON.stringify(data, null, 2));
      }
    } catch (e) {
      setResponse(
        JSON.stringify({ error: e instanceof Error ? e.message : "Invalid JSON" }, null, 2)
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard" });
  };

  const generateCurlCommand = () => {
    const baseUrl = import.meta.env.VITE_SUPABASE_URL;
    return `curl -X ${currentEndpoint.method} \\
  "${baseUrl}${currentEndpoint.path}" \\
  -H "Content-Type: application/json" \\${
    currentEndpoint.requiresAuth
      ? `
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\`
      : ""
  }
  -d '${JSON.stringify(JSON.parse(requestBody))}'`;
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      <SystemHeader systemStatus="online" version="v1.0.0-day6" />

      <main className="container py-8 space-y-8">
        {/* Navigation */}
        <nav className="flex items-center gap-4">
          <Link
            to="/"
            className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← System Overview
          </Link>
          <span className="text-border">|</span>
          <span className="font-mono text-xs text-primary">API Documentation</span>
        </nav>

        {/* Page Header */}
        <div>
          <h1 className="font-mono text-xl font-semibold text-foreground flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            API Documentation
          </h1>
          <p className="font-mono text-sm text-muted-foreground mt-1">
            Interactive documentation for edge function endpoints
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Endpoints List */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="font-mono text-sm">Endpoints</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {ENDPOINTS.map((endpoint, index) => (
                  <button
                    key={endpoint.path}
                    onClick={() => handleEndpointChange(index)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      activeEndpoint === index
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="outline"
                        className={`font-mono text-[10px] ${
                          endpoint.method === "POST"
                            ? "bg-accent/20 text-accent border-accent/30"
                            : "bg-primary/20 text-primary border-primary/30"
                        }`}
                      >
                        {endpoint.method}
                      </Badge>
                      <span className="font-mono text-xs font-medium text-foreground">
                        {endpoint.name}
                      </span>
                    </div>
                    <p className="font-mono text-[10px] text-muted-foreground line-clamp-2">
                      {endpoint.description}
                    </p>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Quick Reference */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="font-mono text-sm flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Event Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {EVENT_TYPES.map((event) => (
                    <AccordionItem key={event.type} value={event.type}>
                      <AccordionTrigger className="font-mono text-xs py-2">
                        {event.type}
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="font-mono text-[10px] text-muted-foreground mb-2">
                          {event.description}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {event.requiredFields.map((field) => (
                            <Badge
                              key={field}
                              variant="outline"
                              className="font-mono text-[9px]"
                            >
                              {field}
                            </Badge>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>

          {/* Interactive Console */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-mono text-sm flex items-center gap-2">
                      <Zap className="h-4 w-4 text-accent" />
                      {currentEndpoint.name}
                    </CardTitle>
                    <CardDescription className="font-mono text-xs mt-1">
                      {currentEndpoint.path}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`font-mono text-[10px] ${
                        currentEndpoint.method === "POST"
                          ? "bg-accent/20 text-accent border-accent/30"
                          : "bg-primary/20 text-primary border-primary/30"
                      }`}
                    >
                      {currentEndpoint.method}
                    </Badge>
                    {currentEndpoint.requiresAuth && (
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px] bg-warning/20 text-warning border-warning/30"
                      >
                        <Shield className="h-3 w-3 mr-1" />
                        Auth Required
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="font-mono text-xs text-muted-foreground">
                  {currentEndpoint.description}
                </p>

                <Separator />

                <Tabs defaultValue="try" className="w-full">
                  <TabsList className="bg-muted/50">
                    <TabsTrigger value="try" className="font-mono text-xs">
                      Try It
                    </TabsTrigger>
                    <TabsTrigger value="curl" className="font-mono text-xs">
                      cURL
                    </TabsTrigger>
                    <TabsTrigger value="response" className="font-mono text-xs">
                      Response Schema
                    </TabsTrigger>
                    <TabsTrigger value="errors" className="font-mono text-xs">
                      Error Codes
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="try" className="space-y-4 mt-4">
                    <div>
                      <label className="font-mono text-xs text-muted-foreground mb-2 block">
                        Request Body
                      </label>
                      <Textarea
                        value={requestBody}
                        onChange={(e) => setRequestBody(e.target.value)}
                        className="font-mono text-xs bg-background min-h-[150px]"
                        placeholder="Enter JSON request body..."
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleExecute}
                        disabled={isLoading}
                        className="font-mono text-xs gap-2"
                      >
                        {isLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                        Execute
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          setRequestBody(
                            JSON.stringify(currentEndpoint.requestBody, null, 2)
                          )
                        }
                        className="font-mono text-xs"
                      >
                        Reset
                      </Button>
                    </div>

                    {response && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="font-mono text-xs text-muted-foreground">
                            Response
                          </label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(response)}
                            className="font-mono text-[10px] h-6"
                          >
                            {copied ? (
                              <Check className="h-3 w-3 mr-1" />
                            ) : (
                              <Copy className="h-3 w-3 mr-1" />
                            )}
                            Copy
                          </Button>
                        </div>
                        <ScrollArea className="h-[200px] rounded-lg border border-border bg-muted/30 p-4">
                          <pre className="font-mono text-xs text-foreground whitespace-pre-wrap">
                            {response}
                          </pre>
                        </ScrollArea>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="curl" className="mt-4">
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(generateCurlCommand())}
                        className="absolute top-2 right-2 font-mono text-[10px] h-6 z-10"
                      >
                        {copied ? (
                          <Check className="h-3 w-3 mr-1" />
                        ) : (
                          <Copy className="h-3 w-3 mr-1" />
                        )}
                        Copy
                      </Button>
                      <CodeBlock
                        code={generateCurlCommand()}
                        language="bash"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="response" className="mt-4">
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleCopy(
                            JSON.stringify(currentEndpoint.responseExample, null, 2)
                          )
                        }
                        className="absolute top-2 right-2 font-mono text-[10px] h-6 z-10"
                      >
                        {copied ? (
                          <Check className="h-3 w-3 mr-1" />
                        ) : (
                          <Copy className="h-3 w-3 mr-1" />
                        )}
                        Copy
                      </Button>
                      <CodeBlock
                        code={JSON.stringify(currentEndpoint.responseExample, null, 2)}
                        language="json"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="errors" className="mt-4">
                    <div className="rounded-lg border border-border overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="font-mono text-xs text-left p-3 border-b border-border">
                              Code
                            </th>
                            <th className="font-mono text-xs text-left p-3 border-b border-border">
                              Description
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentEndpoint.errorCodes.map((err) => (
                            <tr key={err.code} className="hover:bg-muted/30">
                              <td className="font-mono text-xs p-3 border-b border-border">
                                <Badge
                                  variant="outline"
                                  className="font-mono text-[10px] bg-destructive/20 text-destructive border-destructive/30"
                                >
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  {err.code}
                                </Badge>
                              </td>
                              <td className="font-mono text-xs text-muted-foreground p-3 border-b border-border">
                                {err.description}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Authentication Info */}
            <Card className="border-warning/30 bg-warning/5">
              <CardHeader className="pb-3">
                <CardTitle className="font-mono text-sm flex items-center gap-2 text-warning">
                  <Shield className="h-4 w-4" />
                  Authentication
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-mono text-xs text-muted-foreground mb-3">
                  Some endpoints require authentication via JWT token in the Authorization header.
                </p>
                <CodeBlock
                  code={`Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`}
                  language="http"
                />
              </CardContent>
            </Card>

            {/* Rate Limiting */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="font-mono text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4 text-accent" />
                  Rate Limiting
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <p className="font-mono text-[10px] text-muted-foreground">Ingestion</p>
                    <p className="font-mono text-sm font-semibold text-foreground">
                      100 req/min
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground mt-1">
                      Per anonymized token
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <p className="font-mono text-[10px] text-muted-foreground">Analysis</p>
                    <p className="font-mono text-sm font-semibold text-foreground">
                      10 req/min
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground mt-1">
                      Per authenticated user
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-border pt-6">
          <p className="font-mono text-[10px] text-muted-foreground">
            API DOCUMENTATION · STRATUM ANALYTICS
          </p>
        </footer>
      </main>
    </div>
  );
}
