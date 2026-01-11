export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      coherence_scores: {
        Row: {
          components: Json
          computed_at: string
          score: number
          session_id: string
        }
        Insert: {
          components?: Json
          computed_at?: string
          score: number
          session_id: string
        }
        Update: {
          components?: Json
          computed_at?: string
          score?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coherence_scores_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      event_definitions: {
        Row: {
          allowed_payload_shape: Json
          created_at: string
          description: string
          event_type: string
          is_active: boolean
          numeric_bounds: Json
          required_fields: Json
          updated_at: string
        }
        Insert: {
          allowed_payload_shape?: Json
          created_at?: string
          description: string
          event_type: string
          is_active?: boolean
          numeric_bounds?: Json
          required_fields?: Json
          updated_at?: string
        }
        Update: {
          allowed_payload_shape?: Json
          created_at?: string
          description?: string
          event_type?: string
          is_active?: boolean
          numeric_bounds?: Json
          required_fields?: Json
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          depth: number | null
          dwell_seconds: number | null
          event_id: string
          event_type: string
          page_path: string | null
          pause_seconds: number | null
          rage_intensity: number | null
          raw_payload: Json
          section_id: string | null
          session_id: string
        }
        Insert: {
          created_at?: string
          depth?: number | null
          dwell_seconds?: number | null
          event_id?: string
          event_type: string
          page_path?: string | null
          pause_seconds?: number | null
          rage_intensity?: number | null
          raw_payload?: Json
          section_id?: string | null
          session_id: string
        }
        Update: {
          created_at?: string
          depth?: number | null
          dwell_seconds?: number | null
          event_id?: string
          event_type?: string
          page_path?: string | null
          pause_seconds?: number | null
          rage_intensity?: number | null
          raw_payload?: Json
          section_id?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_event_type_fkey"
            columns: ["event_type"]
            isOneToOne: false
            referencedRelation: "event_definitions"
            referencedColumns: ["event_type"]
          },
          {
            foreignKeyName: "events_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["section_id"]
          },
          {
            foreignKeyName: "events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      privacy_audit: {
        Row: {
          anonymized_token: string | null
          audit_id: string
          created_at: string
          event_type: string | null
          rejection_reason: string
          sanitized_payload: Json
          source_ip_hash: string | null
        }
        Insert: {
          anonymized_token?: string | null
          audit_id?: string
          created_at?: string
          event_type?: string | null
          rejection_reason: string
          sanitized_payload?: Json
          source_ip_hash?: string | null
        }
        Update: {
          anonymized_token?: string | null
          audit_id?: string
          created_at?: string
          event_type?: string | null
          rejection_reason?: string
          sanitized_payload?: Json
          source_ip_hash?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          anonymized_token: string
          request_count: number
          updated_at: string
          window_start: string
        }
        Insert: {
          anonymized_token: string
          request_count?: number
          updated_at?: string
          window_start?: string
        }
        Update: {
          anonymized_token?: string
          request_count?: number
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      sections: {
        Row: {
          created_at: string
          display_order: number | null
          page_path: string
          section_id: string
          section_key: string
          section_name: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          page_path: string
          section_id?: string
          section_key: string
          section_name?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number | null
          page_path?: string
          section_id?: string
          section_key?: string
          section_name?: string | null
        }
        Relationships: []
      }
      session_metrics: {
        Row: {
          contact_intent: boolean
          early_exit: boolean
          max_scroll_depth: number
          rage_events: number
          sections_visited: number
          session_id: string
          total_dwell_seconds: number
          total_events: number
          total_pause_seconds: number
          unique_pages: number
          updated_at: string
        }
        Insert: {
          contact_intent?: boolean
          early_exit?: boolean
          max_scroll_depth?: number
          rage_events?: number
          sections_visited?: number
          session_id: string
          total_dwell_seconds?: number
          total_events?: number
          total_pause_seconds?: number
          unique_pages?: number
          updated_at?: string
        }
        Update: {
          contact_intent?: boolean
          early_exit?: boolean
          max_scroll_depth?: number
          rage_events?: number
          sections_visited?: number
          session_id?: string
          total_dwell_seconds?: number
          total_events?: number
          total_pause_seconds?: number
          unique_pages?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_metrics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      sessions: {
        Row: {
          anonymized_token: string
          attributes: Json
          browser_family: Database["public"]["Enums"]["browser_family"] | null
          created_at: string
          device_type: Database["public"]["Enums"]["device_type"] | null
          ended_at: string | null
          entry_path: string
          referrer_type: Database["public"]["Enums"]["referrer_type"]
          session_id: string
          started_at: string
          updated_at: string
        }
        Insert: {
          anonymized_token: string
          attributes?: Json
          browser_family?: Database["public"]["Enums"]["browser_family"] | null
          created_at?: string
          device_type?: Database["public"]["Enums"]["device_type"] | null
          ended_at?: string | null
          entry_path: string
          referrer_type?: Database["public"]["Enums"]["referrer_type"]
          session_id?: string
          started_at?: string
          updated_at?: string
        }
        Update: {
          anonymized_token?: string
          attributes?: Json
          browser_family?: Database["public"]["Enums"]["browser_family"] | null
          created_at?: string
          device_type?: Database["public"]["Enums"]["device_type"] | null
          ended_at?: string | null
          entry_path?: string
          referrer_type?: Database["public"]["Enums"]["referrer_type"]
          session_id?: string
          started_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      anomaly_time_series_view: {
        Row: {
          active_sessions: number | null
          early_exits: number | null
          hour_bucket: string | null
          rage_scrolls: number | null
        }
        Relationships: []
      }
      navigation_flow_view: {
        Row: {
          from_page: string | null
          to_page: string | null
          transition_count: number | null
        }
        Relationships: []
      }
      scroll_depth_distribution_view: {
        Row: {
          count: number | null
          day_bucket: string | null
          depth_bucket: string | null
          page_path: string | null
        }
        Relationships: []
      }
      section_dwell_agg_view: {
        Row: {
          avg_dwell: number | null
          day_bucket: string | null
          event_count: number | null
          median_dwell: number | null
          page_path: string | null
          section_key: string | null
        }
        Relationships: []
      }
      sessions_overview_view: {
        Row: {
          avg_dwell_seconds: number | null
          avg_max_depth: number | null
          contact_intents: number | null
          early_exits: number | null
          hour_bucket: string | null
          referrer_type: Database["public"]["Enums"]["referrer_type"] | null
          session_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      backfill_session_metrics: { Args: never; Returns: number }
      compute_coherence: {
        Args: { p_session_id: string }
        Returns: {
          components: Json
          score: number
        }[]
      }
      recompute_all_coherence: { Args: never; Returns: number }
    }
    Enums: {
      browser_family: "chrome" | "firefox" | "safari" | "edge" | "other"
      device_type: "desktop" | "mobile" | "tablet" | "other"
      referrer_type: "direct" | "known_domain" | "unknown"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      browser_family: ["chrome", "firefox", "safari", "edge", "other"],
      device_type: ["desktop", "mobile", "tablet", "other"],
      referrer_type: ["direct", "known_domain", "unknown"],
    },
  },
} as const
