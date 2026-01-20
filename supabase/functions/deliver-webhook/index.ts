import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'node:crypto'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Webhook {
  id: string
  user_id: string
  name: string
  url: string
  events: string[]
  secret: string | null
  is_active: boolean
  failure_count: number
}

interface WebhookPayload {
  event: string
  timestamp: string
  data: Record<string, unknown>
}

interface DeliveryRequest {
  event_type: string
  data: Record<string, unknown>
  user_id?: string
  webhook_id?: string
}

// deno-lint-ignore no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>

// Generate HMAC signature for webhook payload
function generateSignature(payload: string, secret: string): string {
  const hmac = createHmac('sha256', secret)
  hmac.update(payload)
  return `sha256=${hmac.digest('hex')}`
}

// Deliver webhook to a single endpoint
async function deliverToWebhook(
  supabase: AnySupabaseClient,
  webhook: Webhook,
  eventType: string,
  data: Record<string, unknown>
): Promise<{
  success: boolean
  statusCode: number | null
  responseBody: string | null
  errorMessage: string | null
  responseTimeMs: number
}> {
  const payload: WebhookPayload = {
    event: eventType,
    timestamp: new Date().toISOString(),
    data,
  }

  const payloadString = JSON.stringify(payload)
  const startTime = Date.now()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'Lovable-Webhooks/1.0',
    'X-Webhook-Event': eventType,
    'X-Webhook-Delivery': crypto.randomUUID(),
  }

  // Add signature if secret is configured
  if (webhook.secret) {
    headers['X-Webhook-Signature'] = generateSignature(payloadString, webhook.secret)
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000) // 30s timeout

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: payloadString,
      signal: controller.signal,
    })

    clearTimeout(timeout)

    const responseTimeMs = Date.now() - startTime
    let responseBody: string | null = null

    try {
      responseBody = await response.text()
      // Limit response body size for storage
      if (responseBody.length > 10000) {
        responseBody = responseBody.substring(0, 10000) + '... [truncated]'
      }
    } catch {
      responseBody = null
    }

    const success = response.ok

    // Log the delivery attempt
    await supabase.from('webhook_delivery_logs').insert({
      webhook_id: webhook.id,
      event_type: eventType,
      payload,
      response_status: response.status,
      response_body: responseBody,
      response_time_ms: responseTimeMs,
      success,
      error_message: success ? null : `HTTP ${response.status}: ${response.statusText}`,
    } as Record<string, unknown>)

    // Update webhook status based on result
    if (success) {
      // Reset failure count on success
      await supabase
        .from('webhooks')
        .update({
          last_triggered_at: new Date().toISOString(),
          failure_count: 0,
        } as Record<string, unknown>)
        .eq('id', webhook.id)
    } else {
      // Increment failure count
      const newFailureCount = webhook.failure_count + 1
      const updates: Record<string, unknown> = {
        last_triggered_at: new Date().toISOString(),
        failure_count: newFailureCount,
      }

      // Disable webhook after 5 consecutive failures
      if (newFailureCount >= 5) {
        updates.is_active = false
        console.log(`Webhook ${webhook.id} disabled after ${newFailureCount} consecutive failures`)
      }

      await supabase.from('webhooks').update(updates).eq('id', webhook.id)
    }

    return {
      success,
      statusCode: response.status,
      responseBody,
      errorMessage: success ? null : `HTTP ${response.status}`,
      responseTimeMs,
    }
  } catch (error) {
    const responseTimeMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Log the failed delivery
    await supabase.from('webhook_delivery_logs').insert({
      webhook_id: webhook.id,
      event_type: eventType,
      payload,
      response_status: null,
      response_body: null,
      response_time_ms: responseTimeMs,
      success: false,
      error_message: errorMessage,
    } as Record<string, unknown>)

    // Increment failure count
    const newFailureCount = webhook.failure_count + 1
    const updates: Record<string, unknown> = {
      last_triggered_at: new Date().toISOString(),
      failure_count: newFailureCount,
    }

    if (newFailureCount >= 5) {
      updates.is_active = false
      console.log(`Webhook ${webhook.id} disabled after ${newFailureCount} consecutive failures`)
    }

    await supabase.from('webhooks').update(updates).eq('id', webhook.id)

    return {
      success: false,
      statusCode: null,
      responseBody: null,
      errorMessage,
      responseTimeMs,
    }
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase: AnySupabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const body: DeliveryRequest = await req.json()

    if (!body.event_type || !body.data) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: event_type and data' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log(`Processing webhook delivery for event: ${body.event_type}`)

    // Build query to fetch active webhooks subscribed to this event
    let query = supabase
      .from('webhooks')
      .select('*')
      .eq('is_active', true)
      .contains('events', [body.event_type])

    // Filter by user if specified
    if (body.user_id) {
      query = query.eq('user_id', body.user_id)
    }

    // Filter by specific webhook if specified
    if (body.webhook_id) {
      query = query.eq('id', body.webhook_id)
    }

    const { data: webhooks, error: fetchError } = await query

    if (fetchError) {
      console.error('Error fetching webhooks:', fetchError)
      return new Response(JSON.stringify({ error: 'Failed to fetch webhooks' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!webhooks || webhooks.length === 0) {
      console.log(`No active webhooks found for event: ${body.event_type}`)
      return new Response(
        JSON.stringify({
          message: 'No webhooks subscribed to this event',
          event_type: body.event_type,
          webhooks_delivered: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log(`Found ${webhooks.length} webhook(s) to deliver to`)

    // Deliver to all matching webhooks in parallel
    const deliveryResults = await Promise.all(
      webhooks.map((webhook: Webhook) =>
        deliverToWebhook(supabase, webhook, body.event_type, body.data)
      )
    )

    const successCount = deliveryResults.filter((r) => r.success).length
    const failureCount = deliveryResults.filter((r) => !r.success).length

    console.log(`Delivery complete: ${successCount} succeeded, ${failureCount} failed`)

    return new Response(
      JSON.stringify({
        message: 'Webhook delivery complete',
        event_type: body.event_type,
        webhooks_delivered: webhooks.length,
        success_count: successCount,
        failure_count: failureCount,
        results: deliveryResults.map((r, i) => ({
          webhook_id: webhooks[i].id,
          webhook_name: webhooks[i].name,
          success: r.success,
          status_code: r.statusCode,
          response_time_ms: r.responseTimeMs,
          error: r.errorMessage,
        })),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Webhook delivery error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
