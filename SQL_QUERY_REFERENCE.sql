-- Quick Reference: Query Examples for Structured Coding Problems

-- ============================================================================
-- BASIC QUERIES
-- ============================================================================

-- Get all fields for a specific problem
SELECT 
  problem_title,
  difficulty_level,
  topics,
  problem_description,
  input_format,
  output_format,
  constraints,
  sample_input,
  sample_output,
  explanation,
  edge_cases,
  additional_notes,
  version,
  created_at
FROM project_descriptions
WHERE session_id = 'your-session-id'
ORDER BY version DESC;

-- Get latest version only
SELECT *
FROM project_descriptions
WHERE session_id = 'your-session-id'
ORDER BY version DESC
LIMIT 1;

-- ============================================================================
-- FILTERING BY DIFFICULTY
-- ============================================================================

-- Get all Easy problems
SELECT problem_title, topics, created_at
FROM project_descriptions
WHERE difficulty_level = 'Easy'
ORDER BY created_at DESC;

-- Get all Medium or Hard problems
SELECT problem_title, difficulty_level, topics
FROM project_descriptions
WHERE difficulty_level IN ('Medium', 'Hard')
ORDER BY difficulty_level, created_at DESC;

-- Count problems by difficulty
SELECT 
  difficulty_level,
  COUNT(*) as count
FROM project_descriptions
WHERE difficulty_level != ''
GROUP BY difficulty_level
ORDER BY 
  CASE difficulty_level
    WHEN 'Easy' THEN 1
    WHEN 'Medium' THEN 2
    WHEN 'Hard' THEN 3
    WHEN 'Expert' THEN 4
  END;

-- ============================================================================
-- SEARCHING BY TOPICS
-- ============================================================================

-- Find problems about Arrays
SELECT problem_title, topics, difficulty_level
FROM project_descriptions
WHERE topics ILIKE '%Arrays%'
ORDER BY created_at DESC;

-- Find problems about Dynamic Programming
SELECT problem_title, topics, difficulty_level
FROM project_descriptions
WHERE topics ILIKE '%Dynamic Programming%'
  OR topics ILIKE '%DP%'
ORDER BY difficulty_level, created_at DESC;

-- Find problems with multiple specific topics
SELECT problem_title, topics
FROM project_descriptions
WHERE topics ILIKE '%Arrays%'
  AND topics ILIKE '%Hash%'
ORDER BY created_at DESC;

-- Full-text search on topics
SELECT 
  problem_title,
  topics,
  ts_rank(to_tsvector('english', topics), query) AS rank
FROM project_descriptions,
  to_tsquery('english', 'arrays | strings') AS query
WHERE to_tsvector('english', topics) @@ query
ORDER BY rank DESC;

-- ============================================================================
-- SEARCHING IN PROBLEM DESCRIPTION
-- ============================================================================

-- Search for specific keywords in problem description
SELECT problem_title, difficulty_level
FROM project_descriptions
WHERE problem_description ILIKE '%binary search%'
   OR constraints ILIKE '%binary search%'
ORDER BY created_at DESC;

-- Full-text search across problem content
SELECT 
  problem_title,
  ts_rank(
    to_tsvector('english', 
      problem_title || ' ' || 
      problem_description || ' ' || 
      constraints
    ), 
    query
  ) AS rank
FROM project_descriptions,
  to_tsquery('english', 'algorithm & optimization') AS query
WHERE to_tsvector('english', 
    problem_title || ' ' || 
    problem_description || ' ' || 
    constraints
  ) @@ query
ORDER BY rank DESC;

-- ============================================================================
-- USER-SPECIFIC QUERIES
-- ============================================================================

-- Get all problems created by a specific user
SELECT 
  problem_title,
  difficulty_level,
  topics,
  created_at
FROM project_descriptions
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC;

-- Get user's problem statistics
SELECT 
  user_id,
  COUNT(*) as total_problems,
  COUNT(DISTINCT session_id) as unique_sessions,
  COUNT(CASE WHEN difficulty_level = 'Easy' THEN 1 END) as easy_count,
  COUNT(CASE WHEN difficulty_level = 'Medium' THEN 1 END) as medium_count,
  COUNT(CASE WHEN difficulty_level = 'Hard' THEN 1 END) as hard_count,
  COUNT(CASE WHEN difficulty_level = 'Expert' THEN 1 END) as expert_count
FROM project_descriptions
WHERE user_id = 'user-uuid'
GROUP BY user_id;

-- ============================================================================
-- VERSION MANAGEMENT
-- ============================================================================

-- Get all versions of a problem
SELECT 
  version,
  problem_title,
  difficulty_level,
  created_at
FROM project_descriptions
WHERE session_id = 'session-uuid'
ORDER BY version DESC;

-- Compare two versions
SELECT 
  version,
  problem_title,
  difficulty_level,
  topics,
  LENGTH(problem_description) as description_length,
  created_at
FROM project_descriptions
WHERE session_id = 'session-uuid'
  AND version IN (1, 2)
ORDER BY version;

-- Get latest version for each session
SELECT DISTINCT ON (session_id)
  session_id,
  problem_title,
  difficulty_level,
  topics,
  version,
  created_at
FROM project_descriptions
ORDER BY session_id, version DESC;

-- ============================================================================
-- ADVANCED QUERIES
-- ============================================================================

-- Problems with missing sample outputs
SELECT problem_title, session_id
FROM project_descriptions
WHERE sample_output IS NULL 
   OR sample_output = ''
ORDER BY created_at DESC;

-- Problems with constraints
SELECT 
  problem_title,
  difficulty_level,
  LENGTH(constraints) as constraint_length
FROM project_descriptions
WHERE constraints IS NOT NULL 
  AND constraints != ''
ORDER BY constraint_length DESC;

-- Most popular topics
SELECT 
  unnest(string_to_array(topics, ',')) AS topic,
  COUNT(*) as frequency
FROM project_descriptions
WHERE topics IS NOT NULL AND topics != ''
GROUP BY topic
ORDER BY frequency DESC
LIMIT 20;

-- Problems created in last 7 days
SELECT 
  problem_title,
  difficulty_level,
  topics,
  created_at
FROM project_descriptions
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- ============================================================================
-- VALIDATION QUERIES
-- ============================================================================

-- Find problems with invalid difficulty levels
SELECT problem_title, difficulty_level, session_id
FROM project_descriptions
WHERE difficulty_level NOT IN ('Easy', 'Medium', 'Hard', 'Expert', '');

-- Find problems missing required fields
SELECT 
  session_id,
  problem_title,
  CASE WHEN problem_title = '' THEN 'Missing Title' END as issue_1,
  CASE WHEN difficulty_level = '' THEN 'Missing Difficulty' END as issue_2,
  CASE WHEN topics = '' THEN 'Missing Topics' END as issue_3,
  CASE WHEN sample_input = '' THEN 'Missing Sample Input' END as issue_4,
  CASE WHEN sample_output = '' THEN 'Missing Sample Output' END as issue_5
FROM project_descriptions
WHERE problem_title = ''
   OR difficulty_level = ''
   OR topics = ''
   OR sample_input = ''
   OR sample_output = '';

-- ============================================================================
-- EXPORT QUERIES
-- ============================================================================

-- Export all problem titles and metadata as CSV-friendly format
SELECT 
  problem_title as "Title",
  difficulty_level as "Difficulty",
  topics as "Topics",
  LENGTH(problem_description) as "Description Length",
  created_at as "Created Date"
FROM project_descriptions
ORDER BY created_at DESC;

-- Export complete problem data as JSON-ready
SELECT json_build_object(
  'problemTitle', problem_title,
  'difficultyLevel', difficulty_level,
  'topics', topics,
  'problemDescription', problem_description,
  'inputFormat', input_format,
  'outputFormat', output_format,
  'constraints', constraints,
  'sampleInput', sample_input,
  'sampleOutput', sample_output,
  'explanation', explanation,
  'edgeCases', edge_cases,
  'additionalNotes', additional_notes
) as problem_json
FROM project_descriptions
WHERE session_id = 'your-session-id'
ORDER BY version DESC
LIMIT 1;

-- ============================================================================
-- PERFORMANCE QUERIES
-- ============================================================================

-- Check index usage (requires query execution)
EXPLAIN ANALYZE
SELECT problem_title
FROM project_descriptions
WHERE difficulty_level = 'Medium'
ORDER BY created_at DESC;

-- Table statistics
SELECT 
  COUNT(*) as total_rows,
  COUNT(DISTINCT session_id) as unique_sessions,
  COUNT(DISTINCT user_id) as unique_users,
  MIN(created_at) as oldest_entry,
  MAX(created_at) as newest_entry,
  AVG(version) as avg_versions_per_session
FROM project_descriptions;
