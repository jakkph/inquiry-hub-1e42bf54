import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, FileJson, FileSpreadsheet, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type ExportFormat = "json" | "csv";
type DataType = "sessions" | "events" | "webhooks" | "audit_logs";

const DATA_TYPES: { value: DataType; label: string; description: string }[] = [
  { value: "sessions", label: "Sessions", description: "User session data with metrics" },
  { value: "events", label: "Events", description: "Individual tracking events" },
  { value: "webhooks", label: "Webhooks", description: "Webhook configurations" },
  { value: "audit_logs", label: "Audit Logs", description: "System audit trail" },
];

function convertToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return "";
  
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(",")];
  
  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header];
      if (value === null || value === undefined) return "";
      if (typeof value === "object") return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      if (typeof value === "string" && (value.includes(",") || value.includes('"') || value.includes("\n"))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value);
    });
    csvRows.push(values.join(","));
  }
  
  return csvRows.join("\n");
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function DataExport() {
  const [dataType, setDataType] = useState<DataType>("sessions");
  const [format, setFormat] = useState<ExportFormat>("json");
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      let data: Record<string, unknown>[] = [];
      
      switch (dataType) {
        case "sessions": {
          const { data: sessions, error } = await supabase
            .from("sessions" as never)
            .select("*")
            .order("started_at", { ascending: false })
            .limit(1000);
          if (error) throw error;
          data = (sessions || []) as Record<string, unknown>[];
          break;
        }
        case "events": {
          const { data: events, error } = await supabase
            .from("events" as never)
            .select("*")
            .order("occurred_at", { ascending: false })
            .limit(5000);
          if (error) throw error;
          data = (events || []) as Record<string, unknown>[];
          break;
        }
        case "webhooks": {
          const { data: webhooks, error } = await supabase
            .from("webhooks")
            .select("id, name, url, events, is_active, failure_count, last_triggered_at, created_at");
          if (error) throw error;
          data = (webhooks || []) as Record<string, unknown>[];
          break;
        }
        case "audit_logs": {
          const { data: logs, error } = await supabase
            .from("audit_logs")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(1000);
          if (error) throw error;
          data = (logs || []) as Record<string, unknown>[];
          break;
        }
      }

      if (data.length === 0) {
        toast({
          title: "No data to export",
          description: `No ${dataType} data found to export.`,
          variant: "destructive",
        });
        return;
      }

      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `${dataType}_export_${timestamp}`;

      if (format === "json") {
        downloadFile(JSON.stringify(data, null, 2), `${filename}.json`, "application/json");
      } else {
        downloadFile(convertToCSV(data), `${filename}.csv`, "text/csv");
      }

      toast({
        title: "Export successful",
        description: `Exported ${data.length} ${dataType} records as ${format.toUpperCase()}.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "An error occurred during export.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="font-mono flex items-center gap-2">
          <Download className="h-5 w-5" />
          Data Export
        </CardTitle>
        <CardDescription>
          Download analytics data in JSON or CSV format
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Data Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-mono text-muted-foreground">Data Type</label>
            <Select value={dataType} onValueChange={(v) => setDataType(v as DataType)}>
              <SelectTrigger className="font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATA_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex flex-col">
                      <span className="font-mono">{type.label}</span>
                      <span className="text-xs text-muted-foreground">{type.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Format Selection */}
          <div className="space-y-2">
            <label className="text-sm font-mono text-muted-foreground">Format</label>
            <div className="flex gap-2">
              <Button
                variant={format === "json" ? "default" : "outline"}
                className="flex-1 font-mono"
                onClick={() => setFormat("json")}
              >
                <FileJson className="h-4 w-4 mr-2" />
                JSON
              </Button>
              <Button
                variant={format === "csv" ? "default" : "outline"}
                className="flex-1 font-mono"
                onClick={() => setFormat("csv")}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>

          {/* Export Button */}
          <div className="space-y-2">
            <label className="text-sm font-mono text-muted-foreground">Action</label>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full font-mono"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export {dataType}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Info badges */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border/50">
          <Badge variant="outline" className="font-mono text-xs">
            Max 1,000 sessions
          </Badge>
          <Badge variant="outline" className="font-mono text-xs">
            Max 5,000 events
          </Badge>
          <Badge variant="outline" className="font-mono text-xs">
            UTF-8 encoding
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
