# Privacy-First Analytics System  

**Day 6 Migration - Production Ready**

## Quick Start

```bash
# Test ingestion endpoint
curl -X POST https://cgsfmplplxrosmuvwjoq.supabase.co/functions/v1/ingest \
  -H "Content-Type: application/json" \
  -d '{"event_type":"session_start","anonymized_token":"test123","entry_path":"/"}'
```

## Tables

| Table | Purpose |
|-------|---------|
| `sessions` | Session tracking with anonymized tokens |
| `events` | All event types with validated payloads |
| `session_metrics` | Aggregated session-level metrics |
| `coherence_scores` | Server-computed engagement scores (restricted) |
| `event_definitions` | Event schemas and validation rules |
| `privacy_audit` | Rejected/suspicious payload log |

## Event Types

`session_start`, `scroll_depth`, `section_dwell`, `pause_event`, `exit_event`, `rage_scroll`, `early_exit`, `contact_intent`

## Anonymized Token Generation

```javascript
async function generateAnonymizedToken() {
  const signals = [screen.width + 'x' + screen.height, Intl.DateTimeFormat().resolvedOptions().timeZone].join('|');
  const data = new TextEncoder().encode(signals);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}
```

## Security

- All tables have RLS enabled
- `coherence_scores` restricted to service_role only
- PII patterns detected and rejected at ingestion
- Rate limit: 100 requests/minute per token
