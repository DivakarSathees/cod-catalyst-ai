-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create chat_sessions table
CREATE TABLE public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Project',
  status TEXT NOT NULL DEFAULT 'gathering' CHECK (status IN ('gathering', 'description_ready', 'testcases_configured', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on chat_sessions
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- Chat sessions policies
CREATE POLICY "Users can view their own sessions" ON public.chat_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions" ON public.chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON public.chat_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" ON public.chat_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat messages policies
CREATE POLICY "Users can view their own messages" ON public.chat_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own messages" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create chat_memory table for tracking AI context
CREATE TABLE public.chat_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  questions_asked TEXT[] NOT NULL DEFAULT '{}',
  user_answers JSONB NOT NULL DEFAULT '{}',
  ready_to_generate BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on chat_memory
ALTER TABLE public.chat_memory ENABLE ROW LEVEL SECURITY;

-- Chat memory policies
CREATE POLICY "Users can view their own memory" ON public.chat_memory
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own memory" ON public.chat_memory
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memory" ON public.chat_memory
  FOR UPDATE USING (auth.uid() = user_id);

-- Create project_descriptions table
CREATE TABLE public.project_descriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  overview TEXT NOT NULL DEFAULT '',
  technical_requirements TEXT NOT NULL DEFAULT '',
  functional_requirements TEXT NOT NULL DEFAULT '',
  non_functional_requirements TEXT NOT NULL DEFAULT '',
  constraints TEXT NOT NULL DEFAULT '',
  expected_deliverables TEXT NOT NULL DEFAULT '',
  full_description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on project_descriptions
ALTER TABLE public.project_descriptions ENABLE ROW LEVEL SECURITY;

-- Project descriptions policies
CREATE POLICY "Users can view their own descriptions" ON public.project_descriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own descriptions" ON public.project_descriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own descriptions" ON public.project_descriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Create testcase_configs table
CREATE TABLE public.testcase_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_existence BOOLEAN NOT NULL DEFAULT false,
  file_existence_weight INTEGER NOT NULL DEFAULT 0,
  method_existence BOOLEAN NOT NULL DEFAULT false,
  method_existence_weight INTEGER NOT NULL DEFAULT 0,
  functional BOOLEAN NOT NULL DEFAULT false,
  functional_weight INTEGER NOT NULL DEFAULT 0,
  end_to_end BOOLEAN NOT NULL DEFAULT false,
  end_to_end_weight INTEGER NOT NULL DEFAULT 0,
  api BOOLEAN NOT NULL DEFAULT false,
  api_weight INTEGER NOT NULL DEFAULT 0,
  database BOOLEAN NOT NULL DEFAULT false,
  database_weight INTEGER NOT NULL DEFAULT 0,
  security BOOLEAN NOT NULL DEFAULT false,
  security_weight INTEGER NOT NULL DEFAULT 0,
  performance BOOLEAN NOT NULL DEFAULT false,
  performance_weight INTEGER NOT NULL DEFAULT 0,
  negative BOOLEAN NOT NULL DEFAULT false,
  negative_weight INTEGER NOT NULL DEFAULT 0,
  boundary BOOLEAN NOT NULL DEFAULT false,
  boundary_weight INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on testcase_configs
ALTER TABLE public.testcase_configs ENABLE ROW LEVEL SECURITY;

-- Testcase configs policies
CREATE POLICY "Users can view their own configs" ON public.testcase_configs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own configs" ON public.testcase_configs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own configs" ON public.testcase_configs
  FOR UPDATE USING (auth.uid() = user_id);

-- Create generated_testcases table
CREATE TABLE public.generated_testcases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  test_id TEXT NOT NULL,
  description TEXT NOT NULL,
  steps TEXT NOT NULL DEFAULT '',
  expected_input TEXT NOT NULL DEFAULT '',
  expected_output TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on generated_testcases
ALTER TABLE public.generated_testcases ENABLE ROW LEVEL SECURITY;

-- Generated testcases policies
CREATE POLICY "Users can view their own testcases" ON public.generated_testcases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own testcases" ON public.generated_testcases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own testcases" ON public.generated_testcases
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chat_memory_updated_at
  BEFORE UPDATE ON public.chat_memory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_descriptions_updated_at
  BEFORE UPDATE ON public.project_descriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_testcase_configs_updated_at
  BEFORE UPDATE ON public.testcase_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();