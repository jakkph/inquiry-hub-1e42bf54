-- Create scheduled_exports table
CREATE TABLE public.scheduled_exports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  data_type TEXT NOT NULL CHECK (data_type IN ('sessions', 'events', 'webhooks', 'audit_logs')),
  format TEXT NOT NULL CHECK (format IN ('json', 'csv')),
  schedule TEXT NOT NULL CHECK (schedule IN ('daily', 'weekly', 'monthly')),
  email_to TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_exports ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own scheduled exports"
ON public.scheduled_exports
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scheduled exports"
ON public.scheduled_exports
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled exports"
ON public.scheduled_exports
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled exports"
ON public.scheduled_exports
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_scheduled_exports_updated_at
BEFORE UPDATE ON public.scheduled_exports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();