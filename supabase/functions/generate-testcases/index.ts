import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestcaseConfig {
  category: string;
  weight: number;
  enabled: boolean;
}

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  file_existence: "File Existence Tests - Verify required files and directories exist in the project structure",
  method_existence: "Method Existence Tests - Verify required methods/functions are implemented in the codebase",
  functional: "Functional Tests - Test core functionality, return values, and expected behavior",
  end_to_end: "End-to-End Tests - Complete user journey tests from start to finish",
  api: "API Tests - REST/GraphQL endpoint testing, request/response validation",
  database: "Database Tests - CRUD operations, data integrity, relationships",
  security: "Security Tests - Authentication, authorization, input validation, XSS/CSRF protection",
  performance: "Performance Tests - Load testing, stress testing, response time validation",
  negative: "Negative Tests - Error handling, invalid inputs, edge cases",
  boundary: "Boundary Tests - Min/max values, limits, threshold testing"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectDescription, testcaseConfigs } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const enabledCategories = testcaseConfigs.filter((c: TestcaseConfig) => c.enabled);
    const totalWeight = enabledCategories.reduce((sum: number, c: TestcaseConfig) => sum + c.weight, 0);
    
    // Calculate number of testcases per category based on weight (minimum 2, maximum 10 per category)
    const categoryInstructions = enabledCategories.map((config: TestcaseConfig) => {
      const numTests = Math.max(2, Math.min(10, Math.round((config.weight / totalWeight) * 20)));
      return `- ${CATEGORY_DESCRIPTIONS[config.category]}: Generate ${numTests} testcases (${config.weight}% weight)`;
    }).join("\n");

    const systemPrompt = `You are a test case generator. Generate detailed, professional test cases based on the project description.

For each test case, provide:
1. **Test ID** - Format: XX01, XX02 where XX is category abbreviation (FE=File Existence, ME=Method Existence, FT=Functional, E2E=End-to-End, API=API, DB=Database, ST=Security, PT=Performance, NT=Negative, BT=Boundary)
2. **Description** - Clear description of what the test verifies
3. **Steps** - Numbered list of execution steps
4. **Expected Input** - Test data or preconditions
5. **Expected Output** - Success criteria or expected result

OUTPUT FORMAT:
For each category, output testcases in this exact JSON structure:
{
  "testcases": [
    {
      "category": "category_name",
      "test_id": "XX01",
      "description": "Test description",
      "steps": "1. Step one\\n2. Step two\\n3. Step three",
      "expected_input": "Input data or preconditions",
      "expected_output": "Expected result or success criteria"
    }
  ]
}

Categories and counts to generate:
${categoryInstructions}

Generate comprehensive, realistic test cases that would actually be useful for testing this project.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate test cases for this project:\n\n${projectDescription}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    let testcases = [];
    try {
      const parsed = JSON.parse(content);
      testcases = parsed.testcases || [];
    } catch (e) {
      console.error("Failed to parse testcases JSON:", e);
      return new Response(JSON.stringify({ error: "Failed to parse generated testcases" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ testcases }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate testcases error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
