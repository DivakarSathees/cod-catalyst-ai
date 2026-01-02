-- Add version column to project_descriptions table for supporting multiple versions
ALTER TABLE public.project_descriptions 
ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- Drop the UNIQUE constraint on session_id to allow multiple versions per session
ALTER TABLE public.project_descriptions
DROP CONSTRAINT IF EXISTS project_descriptions_session_id_key;

-- Create a composite unique constraint on session_id and version
ALTER TABLE public.project_descriptions
ADD CONSTRAINT project_descriptions_session_version_unique UNIQUE (session_id, version);

-- Create an index for faster queries on session_id ordered by version
CREATE INDEX IF NOT EXISTS idx_project_descriptions_session_version 
ON public.project_descriptions (session_id, version DESC);
