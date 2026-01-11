import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// PII detection patterns - carefully crafted to avoid false positives on valid hex tokens
const PII_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/i, // email
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // phone (US format)
  /\b\d{3}-\d{2}-\d{4}\b/, // SSN
  /\b(?:\d{1,3}\.){3}\d{1,3}\b/, // IPv4
  /\b([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/, // MAC address (proper format with separators)
]

// Fields that are expected to contain hex tokens and should be excluded from PII checks
const ALLOWED_HEX_FIELDS = ['anonymized_token', 'session_id']

// Coarse UA normalization
function normalizeUserAgent(ua: string | null): { browser_family: string; device_type: string } {
  if (!ua) return { browser_family: 'other', device_type: 'other' }
  
  const uaLower = ua.toLowerCase()
  
  let browser_family: string = 'other'
  if (uaLower.includes('chrome') && !uaLower.includes('edg')) browser_family = 'chrome'
  else if (uaLower.includes('firefox')) browser_family = 'firefox'
  else if (uaLower.includes('safari') && !uaLower.includes('chrome')) browser_family = 'safari'
  else if (uaLower.includes('edg')) browser_family = 'edge'
  
  let device_type: string = 'desktop'
  if (/mobile|android|iphone|ipad|ipod/i.test(ua)) {
    device_type = /ipad|tablet/i.test(ua) ? 'tablet' : 'mobile'
  }
  
  return { browser_family, device_type }
}

// Check for PII in payload (excludes allowed hex fields)
function containsPII(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null) {
    const str = String(obj)
    return PII_PATTERNS.some(pattern => pattern.test(str))
  }
  
  // Check each field, skipping allowed hex token fields
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (ALLOWED_HEX_FIELDS.includes(key)) continue
    
    if (typeof value === 'string') {
      if (PII_PATTERNS.some(pattern => pattern.test(value))) return true
    } else if (typeof value === 'object' && value !== null) {
      if (containsPII(value)) return true
    }
  }
  
  return false
}

// Sanitize payload for privacy audit
function sanitizePayload(obj: unknown): Record<string, unknown> {
  const str = JSON.stringify(obj)
  let sanitized = str
  PII_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]')
  })
  try {
    return JSON.parse(sanitized)
  } catch {
    return { error: 'parse_failed' }
  }
}

// Validate numeric bounds
function validateBounds(value: number, bounds: { min?: number; max?: number }): boolean {
  if (bounds.min !== undefined && value < bounds.min) return false
  if (bounds.max !== undefined && value > bounds.max) return false
  return true
}

interface RateLimitRecord {
  anonymized_token: string;
  request_count: number;
  window_start: string;
  updated_at: string;
}

// deno-lint-ignore no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

// Rate limit check (100 requests per minute per token)
async function checkRateLimit(supabase: AnySupabaseClient, token: string): Promise<boolean> {
  const windowMs = 60000
  const maxRequests = 100
  
  const { data, error } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('anonymized_token', token)
    .single()
  
  if (error && error.code !== 'PGRST116') {
    console.error('Rate limit check error:', error)
    return true // Allow on error
  }
  
  const now = new Date()
  const record = data as RateLimitRecord | null
  
  if (!record) {
    await supabase.from('rate_limits').insert({ 
      anonymized_token: token, 
      request_count: 1, 
      window_start: now.toISOString() 
    } as Record<string, unknown>)
    return true
  }
  
  const windowStart = new Date(record.window_start)
  if (now.getTime() - windowStart.getTime() > windowMs) {
    await supabase.from('rate_limits').update({ 
      request_count: 1, 
      window_start: now.toISOString() 
    } as Record<string, unknown>).eq('anonymized_token', token)
    return true
  }
  
  if (record.request_count >= maxRequests) {
    return false
  }
  
  await supabase.from('rate_limits').update({ 
    request_count: record.request_count + 1 
  } as Record<string, unknown>).eq('anonymized_token', token)
  return true
}

interface EventPayload {
  session_id?: string
  event_type: string
  anonymized_token: string
  entry_path?: string
  referrer_type?: string
  page_path?: string
  section_id?: string
  depth?: number
  dwell_seconds?: number
  pause_seconds?: number
  rage_intensity?: number
  attributes?: Record<string, unknown>
  raw_payload?: Record<string, unknown>
}

interface EventDefinition {
  event_type: string;
  required_fields: string[];
  numeric_bounds: Record<string, { min?: number; max?: number }>;
  allowed_payload_shape: Record<string, string>;
  is_active: boolean;
}

interface SessionMetrics {
  session_id: string;
  total_events: number;
  total_dwell_seconds: number;
  total_pause_seconds: number;
  max_scroll_depth: number;
  sections_visited: number;
  unique_pages: number;
  rage_events: number;
  early_exit: boolean;
  contact_intent: boolean;
}

declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const supabase: AnySupabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const payload: EventPayload = await req.json()
    const userAgent = req.headers.get('user-agent')
    const { browser_family, device_type } = normalizeUserAgent(userAgent)

    // Validate required fields
    if (!payload.event_type || !payload.anonymized_token) {
      return new Response(JSON.stringify({ error: 'missing_required_fields', code: 'E001' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Rate limit check
    const allowed = await checkRateLimit(supabase, payload.anonymized_token)
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'rate_limited', code: 'E002' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fetch event definition
    const { data: eventDefData, error: defError } = await supabase
      .from('event_definitions')
      .select('*')
      .eq('event_type', payload.event_type)
      .eq('is_active', true)
      .single()

    const eventDef = eventDefData as EventDefinition | null

    if (defError || !eventDef) {
      await supabase.from('privacy_audit').insert({
        anonymized_token: payload.anonymized_token,
        event_type: payload.event_type,
        rejection_reason: 'unknown_event_type',
        sanitized_payload: sanitizePayload(payload)
      } as Record<string, unknown>)
      return new Response(JSON.stringify({ error: 'unknown_event_type', code: 'E003' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Validate required fields from definition
    const requiredFields = eventDef.required_fields as string[]
    // deno-lint-ignore no-explicit-any
    const payloadAny = payload as any
    for (const field of requiredFields) {
      if (payloadAny[field] === undefined) {
        await supabase.from('privacy_audit').insert({
          anonymized_token: payload.anonymized_token,
          event_type: payload.event_type,
          rejection_reason: `missing_field:${field}`,
          sanitized_payload: sanitizePayload(payload)
        } as Record<string, unknown>)
        return new Response(JSON.stringify({ error: 'validation_failed', code: 'E004', field }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Validate numeric bounds
    const numericBounds = eventDef.numeric_bounds as Record<string, { min?: number; max?: number }>
    for (const [field, bounds] of Object.entries(numericBounds)) {
      const value = payloadAny[field] as number | undefined
      if (value !== undefined && !validateBounds(value, bounds)) {
        await supabase.from('privacy_audit').insert({
          anonymized_token: payload.anonymized_token,
          event_type: payload.event_type,
          rejection_reason: `bounds_violation:${field}`,
          sanitized_payload: sanitizePayload(payload)
        } as Record<string, unknown>)
        return new Response(JSON.stringify({ error: 'bounds_violation', code: 'E005', field }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // PII detection
    if (containsPII(payload)) {
      await supabase.from('privacy_audit').insert({
        anonymized_token: payload.anonymized_token,
        event_type: payload.event_type,
        rejection_reason: 'pii_detected',
        sanitized_payload: sanitizePayload(payload)
      } as Record<string, unknown>)
      return new Response(JSON.stringify({ error: 'pii_detected', code: 'E006' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    let sessionId = payload.session_id

    // Handle session_start: create new session
    if (payload.event_type === 'session_start') {
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          entry_path: payload.entry_path || '/',
          referrer_type: payload.referrer_type || 'direct',
          anonymized_token: payload.anonymized_token,
          attributes: payload.attributes || {},
          browser_family,
          device_type
        } as Record<string, unknown>)
        .select('session_id')
        .single()

      if (sessionError) {
        console.error('Session creation error:', sessionError)
        return new Response(JSON.stringify({ error: 'session_creation_failed', code: 'E007' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const sessionRecord = session as { session_id: string }
      sessionId = sessionRecord.session_id

      // Initialize session metrics
      await supabase.from('session_metrics').insert({ session_id: sessionId } as Record<string, unknown>)

      return new Response(JSON.stringify({ 
        status: 'accepted', 
        session_id: sessionId,
        event_type: 'session_start'
      }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // For other events, session_id is required
    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'session_required', code: 'E008' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Insert event
    const { error: eventError } = await supabase.from('events').insert({
      session_id: sessionId,
      event_type: payload.event_type,
      page_path: payload.page_path,
      section_id: payload.section_id,
      depth: payload.depth,
      dwell_seconds: payload.dwell_seconds,
      pause_seconds: payload.pause_seconds,
      rage_intensity: payload.rage_intensity,
      raw_payload: payload.raw_payload || {}
    } as Record<string, unknown>)

    if (eventError) {
      console.error('Event insertion error:', eventError)
      return new Response(JSON.stringify({ error: 'event_insertion_failed', code: 'E009' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fetch current metrics and update
    const { data: metricsData } = await supabase
      .from('session_metrics')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    const currentMetrics = metricsData as SessionMetrics | null

    if (currentMetrics) {
      const newMetrics = {
        total_events: currentMetrics.total_events + 1,
        total_dwell_seconds: currentMetrics.total_dwell_seconds + (payload.dwell_seconds || 0),
        total_pause_seconds: currentMetrics.total_pause_seconds + (payload.pause_seconds || 0),
        max_scroll_depth: Math.max(currentMetrics.max_scroll_depth, payload.depth || 0),
        rage_events: currentMetrics.rage_events + (payload.event_type === 'rage_scroll' ? 1 : 0),
        early_exit: currentMetrics.early_exit || payload.event_type === 'early_exit',
        contact_intent: currentMetrics.contact_intent || payload.event_type === 'contact_intent'
      }

      await supabase
        .from('session_metrics')
        .update(newMetrics as Record<string, unknown>)
        .eq('session_id', sessionId)
    }

    // Trigger coherence computation (fire and forget)
    EdgeRuntime.waitUntil(
      (async () => {
        const { error } = await supabase.rpc('compute_coherence', { p_session_id: sessionId })
        if (error) console.error('Coherence computation error:', error)
      })()
    )

    return new Response(JSON.stringify({ 
      status: 'accepted',
      event_type: payload.event_type
    }), {
      status: 202,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('Ingestion error:', err)
    return new Response(JSON.stringify({ error: 'internal_error', code: 'E999' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
