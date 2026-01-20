-- Create webhook delivery logs table
CREATE TABLE public.webhook_delivery_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id uuid NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_status integer,
  response_body text,
  response_time_ms integer,
  success boolean NOT NULL DEFAULT false,
  error_message text,
  attempted_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webhook_delivery_logs ENABLE ROW LEVEL SECURITY;

-- Users can view logs for their own webhooks
CREATE POLICY "Users can view their webhook delivery logs"
ON public.webhook_delivery_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.webhooks
    WHERE webhooks.id = webhook_delivery_logs.webhook_id
    AND webhooks.user_id = auth.uid()
  )
);

-- System can insert logs (via edge functions with service role)
CREATE POLICY "Service role can insert delivery logs"
ON public.webhook_delivery_logs
FOR INSERT
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_webhook_delivery_logs_webhook_id ON public.webhook_delivery_logs(webhook_id);
CREATE INDEX idx_webhook_delivery_logs_attempted_at ON public.webhook_delivery_logs(attempted_at DESC);