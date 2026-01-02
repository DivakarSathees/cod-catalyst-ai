-- Add structured fields to project_descriptions table for coding problems
ALTER TABLE public.project_descriptions
ADD COLUMN IF NOT EXISTS problem_title TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS difficulty_level TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS topics TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS problem_description TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS input_format TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS output_format TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS sample_input TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS sample_output TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS explanation TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS edge_cases TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS additional_notes TEXT DEFAULT '';

-- Add a check constraint for difficulty levels
ALTER TABLE public.project_descriptions
ADD CONSTRAINT check_difficulty_level 
CHECK (difficulty_level IN ('', 'Easy', 'Medium', 'Hard', 'Expert'));

-- Create index for faster searches by difficulty and topics
CREATE INDEX IF NOT EXISTS idx_project_descriptions_difficulty 
ON public.project_descriptions (difficulty_level);

CREATE INDEX IF NOT EXISTS idx_project_descriptions_topics 
ON public.project_descriptions USING gin (to_tsvector('english', topics));

-- Comments for documentation
COMMENT ON COLUMN public.project_descriptions.problem_title IS 'The title of the coding problem';
COMMENT ON COLUMN public.project_descriptions.difficulty_level IS 'Difficulty: Easy, Medium, Hard, or Expert';
COMMENT ON COLUMN public.project_descriptions.topics IS 'Comma-separated topics (e.g., Arrays, DP, Graphs)';
COMMENT ON COLUMN public.project_descriptions.problem_description IS 'Detailed problem description';
COMMENT ON COLUMN public.project_descriptions.input_format IS 'Input format specification';
COMMENT ON COLUMN public.project_descriptions.output_format IS 'Output format specification';
COMMENT ON COLUMN public.project_descriptions.sample_input IS 'Sample input for the problem';
COMMENT ON COLUMN public.project_descriptions.sample_output IS 'Expected output for the sample input';
COMMENT ON COLUMN public.project_descriptions.explanation IS 'Explanation of the sample test case';
COMMENT ON COLUMN public.project_descriptions.edge_cases IS 'Edge cases to consider';
COMMENT ON COLUMN public.project_descriptions.additional_notes IS 'Any additional notes or hints';
