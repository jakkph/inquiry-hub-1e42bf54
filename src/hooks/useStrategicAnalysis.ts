import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AnalysisResult {
  signal: string;
  constraint: string;
  structural_risk: string;
  strategic_vector: string;
  diagnostics: {
    confidence: number;
    analysis_depth: "surface" | "tactical" | "structural" | "systemic";
    secondary_effects: string[];
  };
}

export function useStrategicAnalysis() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = async (query: string): Promise<AnalysisResult | null> => {
    if (!query.trim()) {
      toast.error("Query cannot be empty");
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "strategic-analysis",
        {
          body: { query },
        }
      );

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const analysisResult = data as AnalysisResult;
      setResult(analysisResult);
      return analysisResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Analysis failed";
      setError(message);
      
      // Handle specific error types
      if (message.includes("Rate limit")) {
        toast.error("Rate limit exceeded. Please wait and try again.");
      } else if (message.includes("credits")) {
        toast.error("AI credits exhausted. Please add funds.");
      } else {
        toast.error(`Analysis failed: ${message}`);
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return {
    analyze,
    reset,
    isLoading,
    result,
    error,
  };
}
