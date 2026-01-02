# Structured Coding Problem Description Update

## Overview
This update introduces structured data fields for coding problem descriptions, replacing the previous HTML-based `full_description` format with dedicated database columns for each field.

## What Changed

### 1. Database Schema
Added the following columns to `project_descriptions` table:
- `problem_title` - The title of the coding problem
- `difficulty_level` - One of: Easy, Medium, Hard, Expert
- `topics` - Comma-separated topics (e.g., "Arrays, Dynamic Programming")
- `problem_description` - Detailed problem description (HTML formatted)
- `input_format` - Input format specification (HTML formatted)
- `output_format` - Output format specification (HTML formatted)
- `constraints` - Problem constraints (HTML formatted)
- `sample_input` - Sample input (plain text)
- `sample_output` - Expected output (plain text)
- `explanation` - Explanation of sample test case (HTML formatted)
- `edge_cases` - Edge cases to consider (HTML formatted)
- `additional_notes` - Additional notes or tips (HTML formatted)

### 2. AI Chat Function (`supabase/functions/chat/index.ts`)
- Modified to generate **JSON output** instead of HTML
- The AI now returns a structured JSON object with all the fields above
- Better control over data format and validation

### 3. Frontend (`useChat.ts`)
- Parses the JSON response from AI
- Saves each field individually to the database
- Maintains backward compatibility with `full_description` field
- Handles both old (HTML parsing) and new (structured fields) formats

### 4. UI (`ProjectDescription.tsx`)
- Fetches structured fields directly from database
- Falls back to parsing `full_description` for older versions
- Saves edits to structured fields
- Better rendering of coding problems

## Benefits

1. **Better Data Integrity**: Each field is stored separately, making it easier to validate and query
2. **Easier Editing**: Individual fields can be edited independently
3. **Better Querying**: Can search by difficulty, topics, etc.
4. **Type Safety**: TypeScript types ensure data consistency
5. **API Integration**: Easier to expose individual fields via API
6. **Backward Compatible**: Old descriptions still work via parsing

## Migration Instructions

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/20251230133400_add_structured_fields_to_project_descriptions.sql`
4. Paste into SQL Editor and run

### Option 2: Supabase CLI
If you have Supabase CLI installed:
```bash
cd project-catalyst-ai
supabase db push
```

### Option 3: Manual SQL Execution
Connect to your PostgreSQL database and execute:
```sql
-- See the migration file for full SQL
ALTER TABLE public.project_descriptions
ADD COLUMN IF NOT EXISTS problem_title TEXT DEFAULT '',
-- ... rest of the columns
```

## Data Structure

### JSON Format from AI
```json
{
  "problemTitle": "Two Sum",
  "difficultyLevel": "Easy",
  "topics": "Arrays, Hash Table",
  "problemDescription": "<p>Given an array of integers...</p>",
  "inputFormat": "<p>First line: <code>n</code> (size of array)</p>",
  "outputFormat": "<p>Two space-separated integers...</p>",
  "constraints": "<ul><li>1 ≤ n ≤ 10^5</li></ul>",
  "sampleInput": "5\n2 7 11 15 9\n9",
  "sampleOutput": "0 1",
  "explanation": "<p>nums[0] + nums[1] equals 9...</p>",
  "edgeCases": "<ul><li>Array with duplicates</li></ul>",
  "additionalNotes": ""
}
```

### Database Fields
All fields from the JSON are stored individually in the database, plus:
- `full_description` - Reconstructed text version for backward compatibility
- `version` - Version number for tracking changes
- `session_id` - Link to chat session
- `user_id` - Owner of the description

## Usage Examples

### Creating a New Problem Description
The chat flow remains the same:
1. User answers AI questions
2. Click "Generate Description"
3. AI generates structured JSON
4. Data is parsed and saved to individual fields

### Accessing Data

#### From Frontend
```typescript
const { data } = await supabase
  .from("project_descriptions")
  .select("problem_title, difficulty_level, topics, ...")
  .eq("session_id", sessionId)
  .single();
```

#### Query by Difficulty
```typescript
const { data } = await supabase
  .from("project_descriptions")
  .select("*")
  .eq("difficulty_level", "Medium")
  .order("created_at", { ascending: false });
```

#### Search by Topic
```typescript
const { data } = await supabase
  .from("project_descriptions")
  .select("*")
  .textSearch("topics", "Arrays");
```

## Testing

1. **New Descriptions**: Create a new chat session and generate a description. Verify all fields are populated.
2. **Old Descriptions**: View an older description to ensure parsing fallback works.
3. **Editing**: Edit and save changes to verify structured field updates work.
4. **Version Management**: Create multiple versions and switch between them.

## Troubleshooting

### Issue: Fields are empty after generation
**Solution**: Check browser console for JSON parsing errors. The AI might have returned markdown-wrapped JSON.

### Issue: Old descriptions don't display correctly
**Solution**: The system automatically falls back to parsing `full_description`. Check if the parsing logic in `descriptionParser.ts` needs updates.

### Issue: Migration fails
**Solution**: Ensure you have proper database permissions. The migration adds columns with default values, so it should be safe.

## Future Enhancements

1. **Test Case Management**: Link test cases to specific problems
2. **Solution Tracking**: Add solution fields for reference implementations
3. **Difficulty Auto-Detection**: AI analyzes constraints to suggest difficulty
4. **Topic Tagging**: Tag system for better categorization
5. **Export Formats**: Export to LeetCode, HackerRank format
6. **Analytics**: Track problem statistics and user performance

## Rollback

If you need to rollback this change:
```sql
-- Remove the new columns (data will be lost)
ALTER TABLE public.project_descriptions
DROP COLUMN problem_title,
DROP COLUMN difficulty_level,
DROP COLUMN topics,
DROP COLUMN problem_description,
DROP COLUMN input_format,
DROP COLUMN output_format,
DROP COLUMN constraints,
DROP COLUMN sample_input,
DROP COLUMN sample_output,
DROP COLUMN explanation,
DROP COLUMN edge_cases,
DROP COLUMN additional_notes;

-- Revert Edge Function to previous version using git
```

## Support

For issues or questions:
1. Check browser console for errors
2. Verify database schema matches migration
3. Test with a new chat session
4. Review AI response in network tab

---

**Last Updated**: December 30, 2024
**Migration Version**: 20251230133400
