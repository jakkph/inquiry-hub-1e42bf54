-- Enable realtime for sessions table
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;

-- Enable realtime for events table  
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;