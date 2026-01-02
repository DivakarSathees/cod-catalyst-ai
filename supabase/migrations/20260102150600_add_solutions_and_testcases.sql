-- Create solutions table for storing generated and user solutions
CREATE TABLE public.problem_solutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  description_id UUID REFERENCES public.project_descriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'python',
  code TEXT NOT NULL DEFAULT '',
  is_ai_generated BOOLEAN NOT NULL DEFAULT false,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'working', 'accepted')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_solution_version UNIQUE (session_id, language, version)
);

-- Create problem_testcases table for storing test cases
CREATE TABLE public.problem_testcases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  description_id UUID REFERENCES public.project_descriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  input_data TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_sample BOOLEAN NOT NULL DEFAULT false,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  test_category TEXT DEFAULT 'functional' CHECK (test_category IN ('sample', 'basic', 'edge', 'boundary', 'stress', 'custom')),
  difficulty_level TEXT CHECK (difficulty_level IN ('Easy', 'Medium', 'Hard') OR difficulty_level IS NULL),
  weight INTEGER DEFAULT 10 CHECK (weight >= 0 AND weight <= 100),
  time_limit INTEGER DEFAULT 1000, -- in milliseconds
  memory_limit INTEGER DEFAULT 128, -- in MB
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create test_results table for storing execution results
CREATE TABLE public.test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solution_id UUID NOT NULL REFERENCES public.problem_solutions(id) ON DELETE CASCADE,
  testcase_id UUID REFERENCES public.problem_testcases(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'error', 'timeout', 'memory_exceeded')),
  actual_output TEXT,
  execution_time INTEGER, -- in milliseconds
  memory_used INTEGER, -- in KB
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.problem_solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problem_testcases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for problem_solutions
CREATE POLICY "Users can view their own solutions" ON public.problem_solutions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own solutions" ON public.problem_solutions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own solutions" ON public.problem_solutions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own solutions" ON public.problem_solutions
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for problem_testcases
CREATE POLICY "Users can view their own testcases" ON public.problem_testcases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own testcases" ON public.problem_testcases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own testcases" ON public.problem_testcases
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own testcases" ON public.problem_testcases
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for test_results
CREATE POLICY "Users can view their own test results" ON public.test_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own test results" ON public.test_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_problem_solutions_updated_at
  BEFORE UPDATE ON public.problem_solutions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_problem_testcases_updated_at
  BEFORE UPDATE ON public.problem_testcases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_problem_solutions_session ON public.problem_solutions(session_id, language, version DESC);
CREATE INDEX idx_problem_testcases_session ON public.problem_testcases(session_id, order_index);
CREATE INDEX idx_test_results_solution ON public.test_results(solution_id, created_at DESC);

-- Comments
COMMENT ON TABLE public.problem_solutions IS 'Stores solutions for coding problems in various languages';
COMMENT ON TABLE public.problem_testcases IS 'Stores test cases for validating solutions';
COMMENT ON TABLE public.test_results IS 'Stores execution results from running test cases';

COMMENT ON COLUMN public.problem_solutions.language IS 'Programming language: python, java, cpp, javascript, etc.';
COMMENT ON COLUMN public.problem_solutions.is_ai_generated IS 'Whether this solution was generated by AI';
COMMENT ON COLUMN public.problem_testcases.is_sample IS 'Whether this is a sample test case shown to users';
COMMENT ON COLUMN public.problem_testcases.is_hidden IS 'Whether this test case is hidden from users';
COMMENT ON COLUMN public.problem_testcases.weight IS 'Weight/points for this test case';
