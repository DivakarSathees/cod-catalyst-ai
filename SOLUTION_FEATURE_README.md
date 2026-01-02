# Solution Generation & Code Execution Feature

## Overview
This feature adds a complete code editor with AI-powered solution generation, test case management, and code execution capabilities to the Project Description page.

## Features

### 1. **AI Solution Generation**
- Generate optimal solutions in multiple programming languages
- Clean, well-commented code following best practices
- Language support: Python, JavaScript, TypeScript, Java, C++, C, Go, Rust

### 2. **Code Editor**
- Monaco Editor (same as VS Code)
- Syntax highlighting
- Auto-completion
- Multi-language support
- Dark theme optimized for coding

### 3. **Code Execution**
- Run code with custom input
- Execute all test cases
- Real-time output display
- Execution time tracking
- Error reporting

### 4. **Test Case Management**
- AI-generated test cases
- Manual test case creation/editing
- Test categories: Sample, Basic, Edge, Boundary, Stress
- Editable input/output
- Test case weights

### 5. **Test Results**
- Visual pass/fail indicators
- Execution time for each test
- Side-by-side comparison of expected vs actual output
- Summary statistics (passed/failed/errors)

## Database Schema

### Tables Created:
1. **problem_solutions** - Stores solution code in various languages
   - Fields: language, code, version, is_ai_generated, status
   
2. **problem_testcases** - Stores test cases
   - Fields: test_name, input_data, expected_output, category, weight, is_sample
   
3. **test_results** - Stores execution results
   - Fields: status, actual_output, execution_time, memory_used, error_message

## Edge Functions

### 1. generate-solution
- **Path**: `/functions/v1/generate-solution`
- **Purpose**: Generate AI solutions using Azure OpenAI
- **Request**:
  ```json
  {
    "problemDescription": "string",
    "language": "python|javascript|java|cpp...",
    "difficulty": "Easy|Medium|Hard|Expert"
  }
  ```
- **Response**:
  ```json
  {
    "solution": "generated code"
  }
  ```

### 2. execute-code
- **Path**: `/functions/v1/execute-code`
- **Purpose**: Execute code using Piston API
- **Request**:
  ```json
  {
    "language": "python",
    "code": "print('hello')",
    "input": "test input",
    "timeLimit": 5000,
    "memoryLimit": 128
  }
  ```
- **Response**:
  ```json
  {
    "status": "success|error|timeout",
    "output": "execution output",
    "error": "error message if any",
    "executionTime": 123
  }
  ```

### 3. generate-testcases
- **Path**: `/functions/v1/generate-testcases`
- **Purpose**: Generate comprehensive test cases using AI
- **Request**:
  ```json
  {
    "problemDescription": "string",
    "inputFormat": "string",
    "outputFormat": "string",
    "constraints": "string",
    "sampleInput": "string",
    "sampleOutput": "string",
    "count": 5
  }
  ```
- **Response**:
  ```json
  {
    "testCases": [
      {
        "testName": "Test 1",
        "input": "input data",
        "expectedOutput": "expected output",
        "category": "basic",
        "weight": 10
      }
    ]
  }
  ```

## UI Components

### SolutionEditor Component
Location: `src/components/SolutionEditor.tsx`

**Props**:
```typescript
{
  sessionId: string;
  problemDescription: {
    problemTitle: string;
    problemDescription: string;
    inputFormat: string;
    outputFormat: string;
    constraints: string;
    sampleInput: string;
    sampleOutput: string;
    difficulty?: string;
  };
}
```

### CodeEditor Component
Location: `src/components/CodeEditor.tsx`

**Props**:
```typescript
{
  value: string;
  onChange: (value: string | undefined) => void;
  language: string;
  readOnly?: boolean;
  height?: string;
  theme?: "vs-dark" | "light" | "vs";
}
```

## How to Use

### 1. **View Problem Description**
- Navigate to the Project Description page
- Switch between "Problem Description" and "Solution & Testing" tabs

### 2. **Generate Solution**
1. Go to "Solution & Testing" tab
2. Select programming language
3. Click "Generate Solution"
4. AI will generate an optimal solution
5. Click "Save" to store the solution

### 3. **Write Custom Solution**
1. Select language
2. Write code in the Monaco editor
3. Click "Save" to store

###4. **Run Code with Custom Input**
1. Enter input in the "Custom Input" textarea
2. Click "Run Code"
3. View output in the "Output" panel

### 5. **Generate Test Cases**
1. Go to "Test Cases" tab
2. Click "Generate Tests"
3. AI will create 5+ comprehensive test cases
4. Review and edit as needed

### 6. **Add Manual Test Cases**
1. Click "Add Test Case"
2. Fill in:
   - Test name
   - Input data
   - Expected output
3. Click "Save"

### 7. **Run All Tests**
1. Write or generate solution
2. Ensure test cases exist
3. Click "Run All Tests"
4. View results in "Results" tab

### 8. **View Test Results**
- **Passed**: Green check icon
- **Failed**: Red X icon with diff
- **Error/Timeout**: Orange icon with error message
- Execution time for each test

## Migration Steps

### 1. Apply Database Migration
```bash
# Copy the migration file to your Supabase project
# Then apply via Supabase dashboard SQL editor or CLI

# Via Supabase dashboard:
# 1. Go to SQL Editor
# 2. Copy contents of supabase/migrations/20260102150600_add_solutions_and_testcases.sql
# 3. Run

# Via Supabase CLI (if installed):
cd project-catalyst-ai
supabase db push
```

### 2. Install Dependencies
```bash
npm install @monaco-editor/react
```

### 3. Deploy Edge Functions
```bash
# Deploy all three new edge functions
supabase functions deploy generate-solution
supabase functions deploy execute-code
supabase functions deploy generate-testcases
```

### 4. Regenerate Supabase Types (After Migration)
```bash
# This fixes the TypeScript errors
supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
```

## TypeScript Errors (Temporary)

The current TypeScript errors are expected because:
1. Database migrations haven't been applied yet
2. Supabase types haven't been regenerated

**These will be resolved automatically after:**
1. Running the database migration
2. Regenerating types with `supabase gen types`

## Code Execution Service

This implementation uses the **Piston API** (https://emkc.org/api/v2/piston) for code execution:
- ✅ Free and open source
- ✅ Supports 40+ languages
- ✅ Sandboxed execution
- ✅ No API key required
- ✅ Rate limits: reasonable for development

**Alternative**: You can replace Piston with Judge0, LeetCode's API, or a custom Docker-based solution by modifying the `execute-code/index.ts` function.

## Security Considerations

1. **Code Execution**: Uses sandboxed Piston API
2. **RLS Policies**: All database tables have Row Level Security enabled
3. **User Isolation**: Users can only access their own solutions/testcases
4. **Input Validation**: AI prompts sanitize user input
5. **Rate Limiting**: Consider adding rate limits to Edge Functions

## Limitations

1. **Execution Time**: Limited to Piston API's timeouts (default 5s)
2. **Memory**: Limited to Piston API's memory limits (default 128MB)
3. **Languages**: Limited to Piston API's supported languages
4. **Concurrent Tests**: Tests run sequentially, not in parallel
5. **File Size**: No file upload support yet

## Future Enhancements

1. **Multiple Test Suites**: Organize tests into groups
2. **Test Coverage**: Track which parts of code are tested
3. **Performance Metrics**: Track solution efficiency over time
4. **Leaderboards**: Compare solutions with other users
5. **Code Reviews**: AI-powered code review suggestions
6. **Debugging Tools**: Step-through debugging support
7. **Collaborative Coding**: Real-time collaboration
8. **IDE Integration**: VS Code extension

## Troubleshooting

### Issue: Monaco Editor Not Loading
**Solution**: Check that `@monaco-editor/react` is installed:
```bash
npm install @monaco-editor/react
```

### Issue: Code Execution Fails
**Solution**: Check Piston API status. If down, consider alternative APIs.

### Issue: TypeScript Errors
**Solution**: Run database migrations and regenerate Supabase types.

### Issue: Test Cases Not Saving
**Solution**: Verify RLS policies are set correctly and user is authenticated.

### Issue: AI Generation Fails
**Solution**: Check Azure OpenAI API keys in Supabase secrets.

## Example Workflow

1. **Create Problem** → Chat with AI to define problem
2. **Generate Description** → AI creates structured problem
3. **Switch to Solution Tab** → Click "Solution & Testing"
4. **Select Language** → Choose Python/JavaScript/etc.
5. **Generate Solution** → AI creates optimal code
6. **Generate Tests** → AI creates 5+ test cases
7. **Run Tests** → Execute all tests
8. **Review Results** → Check pass/fail status
9. **Edit & Retry** → Modify code and rerun
10. **Save Final Version** → Store approved solution

## API Integration Example

```typescript
// Generate solution
const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-solution`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_KEY}`
  },
  body: JSON.stringify({
    problemDescription: "Find the sum of two numbers",
    language: "python",
    difficulty: "Easy"
  })
});

const { solution } = await response.json();
console.log(solution);
// Output: Clean, working Python code
```

---

**Last Updated**: January 2, 2026  
**Version**: 1.0.0  
**Status**: Ready for Testing 🚀
