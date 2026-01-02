# Debugging Empty Solution Response

## Issue
Getting `{"solution":""}` from the generate-solution Edge Function.

## Steps to Debug

### 1. Deploy Updated Function
Since you don't have Supabase CLI, deploy via the dashboard:

1. Go to **Supabase Dashboard** → Your Project
2. Navigate to **Edge Functions**
3. Click on **generate-solution** function
4. Click **Deploy new version**
5. Copy the contents of `supabase/functions/generate-solution/index.ts`
6. Paste and deploy

### 2. Check Logs
After deploying, test the function and check logs:

1. In Supabase Dashboard → **Edge Functions**
2. Click on **generate-solution**
3. Go to **Logs** tab
4. Trigger the function from your app
5. Watch the logs appear in real-time

### 3. What to Look For

The logs will show:
```
=== Generate Solution Request ===
URL: https://...
Language: python
Difficulty: Medium
Request body: { ... }
Response status: 200
=== Azure API Response ===
Full response: { ... }
Choices array: [...]
Content: "..."
```

### 4. Common Issues & Fixes

#### Issue A: API Key Invalid
**Logs show**: 401 Unauthorized
**Fix**: Check Azure API key in Supabase secrets

#### Issue B: Response Structure Different
**Logs show**: Content is undefined
**Fix**: The response structure might be different. Check the "Full response" log to see the actual structure

#### Issue C: Model Name Wrong
**Logs show**: Model not found
**Fix**: Verify `AZURE_OPENAI_DEPLOYMENT` environment variable

#### Issue D: Endpoint Wrong
**Logs show**: Connection refused
**Fix**: Verify `AZURE_OPENAI_ENDPOINT` environment variable

### 5. Quick Test Without Frontend

You can test directly using curl:

```bash
curl -X POST https://dorpaordszxgxcoosyce.supabase.co/functions/v1/generate-solution \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "problemDescription": "Write a function that adds two numbers",
    "language": "python",
    "difficulty": "Easy"
  }'
```

### 6. Alternative: Test Locally

If you want to test locally before deploying:

```bash
# Install Supabase CLI (optional)
brew install supabase/tap/supabase

# Start local functions
cd project-catalyst-ai
supabase functions serve generate-solution --no-verify-jwt

# Test in another terminal
curl -X POST http://localhost:54321/functions/v1/generate-solution \
  -H "Content-Type: application/json" \
  -d '{
    "problemDescription": "Add two numbers",
    "language": "python",
    "difficulty": "Easy"
  }'
```

### 7. Check Environment Variables

Make sure these are set in Supabase:

1. Go to **Project Settings** → **Edge Functions**
2. Check these variables exist:
   - `AZURE_OPENAI_ENDPOINT`
   - `AZURE_OPENAI_API_KEY`
   - `AZURE_OPENAI_DEPLOYMENT`
   - `AZURE_API_VERSION` (should be "2024-12-01-preview")

### 8. Fallback Solution

If Azure OpenAI isn't working, you can temporarily switch to the Groq API by modifying the function:

```typescript
// Replace Azure endpoint with Groq
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${GROQ_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "mixtral-8x7b-32768",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 2000,
    temperature: 0.3,
  }),
});
```

## Next Steps

1. ✅ **Deploy the updated function** (with logging)
2. ✅ **Trigger from your app**
3. ✅ **Check the logs** to see what's happening
4. ✅ **Report back** with what you see in the logs

The detailed logging will tell us exactly where the problem is!
