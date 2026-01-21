import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@4.0.0'
import { encode as base64Encode } from 'https://deno.land/std@0.208.0/encoding/base64.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

// deno-lint-ignore no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>

interface ScheduledExport {
  id: string
  user_id: string
  name: string
  data_type: 'sessions' | 'events' | 'webhooks' | 'audit_logs'
  format: 'json' | 'csv'
  schedule: 'daily' | 'weekly' | 'monthly'
  email_to: string
  is_active: boolean
  last_run_at: string | null
  next_run_at: string | null
}

function convertToCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return ''
  
  const headers = Object.keys(data[0])
  const csvRows = [headers.join(',')]
  
  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header]
      if (value === null || value === undefined) return ''
      if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return String(value)
    })
    csvRows.push(values.join(','))
  }
  
  return csvRows.join('\n')
}

async function fetchExportData(
  supabase: AnySupabaseClient,
  dataType: ScheduledExport['data_type']
): Promise<Record<string, unknown>[]> {
  switch (dataType) {
    case 'sessions': {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(1000)
      if (error) throw error
      return data || []
    }
    case 'events': {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('occurred_at', { ascending: false })
        .limit(5000)
      if (error) throw error
      return data || []
    }
    case 'webhooks': {
      const { data, error } = await supabase
        .from('webhooks')
        .select('id, name, url, events, is_active, failure_count, last_triggered_at, created_at')
      if (error) throw error
      return data || []
    }
    case 'audit_logs': {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000)
      if (error) throw error
      return data || []
    }
    default:
      return []
  }
}

function calculateNextRun(schedule: ScheduledExport['schedule']): Date {
  const now = new Date()
  switch (schedule) {
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000)
    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    case 'monthly':
      return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
  }
}

Deno.serve(async (req) => {
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
    const body = await req.json()
    const exportId = body.export_id as string

    if (!exportId) {
      return new Response(JSON.stringify({ error: 'Missing export_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch the export configuration
    const { data: exportConfig, error: fetchError } = await supabase
      .from('scheduled_exports')
      .select('*')
      .eq('id', exportId)
      .single()

    if (fetchError || !exportConfig) {
      console.error('Export fetch error:', fetchError)
      return new Response(JSON.stringify({ error: 'Export not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const exp = exportConfig as ScheduledExport
    console.log(`Running scheduled export: ${exp.name} (${exp.data_type})`)

    // Fetch the data
    const data = await fetchExportData(supabase, exp.data_type)

    if (data.length === 0) {
      console.log('No data to export')
      return new Response(JSON.stringify({ 
        message: 'No data to export',
        records: 0 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Format the data
    const timestamp = new Date().toISOString().slice(0, 10)
    const filename = `${exp.data_type}_export_${timestamp}.${exp.format}`
    const content = exp.format === 'json' 
      ? JSON.stringify(data, null, 2) 
      : convertToCSV(data)

    // Send email with attachment
    const { error: emailError } = await resend.emails.send({
      from: 'Lovable Analytics <onboarding@resend.dev>',
      to: [exp.email_to],
      subject: `[${exp.name}] ${exp.data_type} Export - ${timestamp}`,
      html: `
        <h2>Scheduled Export: ${exp.name}</h2>
        <p>Your scheduled ${exp.schedule} export is ready.</p>
        <ul>
          <li><strong>Data Type:</strong> ${exp.data_type}</li>
          <li><strong>Format:</strong> ${exp.format.toUpperCase()}</li>
          <li><strong>Records:</strong> ${data.length}</li>
          <li><strong>Generated:</strong> ${new Date().toISOString()}</li>
        </ul>
        <p>The export file is attached to this email.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          This is an automated export from your Lovable Analytics dashboard.
        </p>
      `,
      attachments: [
        {
          filename,
          content: base64Encode(new TextEncoder().encode(content)),
        },
      ],
    })

    if (emailError) {
      console.error('Email send error:', emailError)
      throw new Error(`Failed to send email: ${emailError.message}`)
    }

    // Update the export record
    const nextRun = calculateNextRun(exp.schedule)
    await supabase
      .from('scheduled_exports')
      .update({
        last_run_at: new Date().toISOString(),
        next_run_at: nextRun.toISOString(),
      } as Record<string, unknown>)
      .eq('id', exportId)

    console.log(`Export sent successfully to ${exp.email_to}`)

    return new Response(JSON.stringify({
      message: 'Export sent successfully',
      email: exp.email_to,
      records: data.length,
      next_run: nextRun.toISOString(),
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Export error:', error)
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
