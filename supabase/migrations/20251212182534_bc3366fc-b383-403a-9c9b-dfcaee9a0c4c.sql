-- Create profiles table for Bluesky users
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  bluesky_handle TEXT,
  bluesky_did TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- Create updraft_recaps table for storing generated recaps
CREATE TABLE public.updraft_recaps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now())::INTEGER,
  total_posts INTEGER DEFAULT 0,
  total_likes INTEGER DEFAULT 0,
  total_reposts INTEGER DEFAULT 0,
  total_followers_gained INTEGER DEFAULT 0,
  total_reach INTEGER DEFAULT 0,
  top_post_text TEXT,
  top_post_engagement INTEGER DEFAULT 0,
  top_theme TEXT,
  most_active_month TEXT,
  most_active_day TEXT,
  streak_days INTEGER DEFAULT 0,
  recap_variant TEXT DEFAULT 'lift',
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, year)
);

-- Enable RLS
ALTER TABLE public.updraft_recaps ENABLE ROW LEVEL SECURITY;

-- Policies for recaps
CREATE POLICY "Users can view their own recaps" 
ON public.updraft_recaps FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recaps" 
ON public.updraft_recaps FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recaps" 
ON public.updraft_recaps FOR UPDATE 
USING (auth.uid() = user_id);

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (new.id);
  RETURN new;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();