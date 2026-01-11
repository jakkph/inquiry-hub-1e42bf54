-- Create profiles table for operator data
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  operator_alias TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Operators can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Operators can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Operators can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Create query_history table for saving queries and diagnostic outputs
CREATE TABLE public.query_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  query_input TEXT NOT NULL,
  response_signal TEXT,
  response_constraint TEXT,
  response_structural_risk TEXT,
  response_strategic_vector TEXT,
  response_diagnostics JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on query_history
ALTER TABLE public.query_history ENABLE ROW LEVEL SECURITY;

-- Query history policies - operators can only see their own queries
CREATE POLICY "Operators can view their own queries" 
ON public.query_history FOR SELECT 
USING (auth.uid() = operator_id);

CREATE POLICY "Operators can insert their own queries" 
ON public.query_history FOR INSERT 
WITH CHECK (auth.uid() = operator_id);

CREATE POLICY "Operators can delete their own queries" 
ON public.query_history FOR DELETE 
USING (auth.uid() = operator_id);

-- Create index for faster query lookups
CREATE INDEX idx_query_history_operator_id ON public.query_history(operator_id);
CREATE INDEX idx_query_history_created_at ON public.query_history(created_at DESC);

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, operator_alias)
  VALUES (new.id, new.raw_user_meta_data ->> 'operator_alias');
  RETURN new;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();