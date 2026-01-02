import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { problemDescription, inputFormat, outputFormat, constraints, sampleInput, sampleOutput, count = 5 } = await req.json();

    const AZURE_ENDPOINT = Deno.env.get("AZURE_OPENAI_ENDPOINT") || "https://iamneo-qb.openai.azure.com/";
    const AZURE_API_KEY = Deno.env.get("AZURE_OPENAI_API_KEY") || "BseWgixIxbzsRMTI9XcdwIS39aVLQT791lDu1gi3rBBFngSSOH7vJQQJ99BIACYeBjFXJ3w3AAABACOGv3VO";
    const AZURE_DEPLOYMENT = Deno.env.get("AZURE_OPENAI_DEPLOYMENT") || "gpt-5-mini";
    const AZURE_API_VERSION = "2024-12-01-preview";

    const systemPrompt = `You are an expert at creating comprehensive test cases for coding problems.

Generate ${count} diverse test cases that include:
- Basic functional cases
- Edge cases
- Boundary cases
- Corner cases

Output ONLY a valid JSON array with this structure:
[
  {
    "testName": "Test case name",
    "input": "input data",
    "expectedOutput": "expected output",
    "category": "sample|basic|edge|boundary|stress",
    "weight": 10
  }
]

Follow the exact input and output formats specified. Do NOT include markdown or extra text.`;

    const userPrompt = `Problem Description:
${problemDescription}

Input Format:
${inputFormat}

Output Format:
${outputFormat}

Constraints:
${constraints}

Sample:
Input: ${sampleInput}
Output: ${sampleOutput}

Generate ${count} comprehensive test cases covering different scenarios.`;

    const url = `${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}/chat/completions?api-version=${AZURE_API_VERSION}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "api-key": AZURE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AZURE_DEPLOYMENT,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_completion_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure API error: ${errorText}`);
    }

    const data = await response.json();
    let testCasesStr = data.choices?.[0]?.message?.content || "[]";

    // Clean up any potential markdown formatting
    testCasesStr = testCasesStr.trim();
    if (testCasesStr.startsWith("```json")) {
      testCasesStr = testCasesStr
        .replace(/^```json\n?/, "")
        .replace(/```\s*$/, "")
        .trim();
    } else if (testCasesStr.startsWith("```")) {
      testCasesStr = testCasesStr
        .replace(/^```\n?/, "")
        .replace(/```\s*$/, "")
        .trim();
    }

    const testCases = JSON.parse(testCasesStr);

    return new Response(
      JSON.stringify({ testCases }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Test case generation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
