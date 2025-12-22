import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatMemory {
  questions_asked: string[];
  user_answers: Record<string, string>;
  ready_to_generate: boolean;
}

const REQUIREMENT_CATEGORIES = [
  "problem_type",
  "difficulty",
  "topic",
  "constraints",
  "input_output_spec",
  "edge_cases"
];


// const SYSTEM_PROMPT = `You are an AI assistant helping users create detailed project descriptions for software applications. Your goal is to gather comprehensive requirements by asking clarifying questions.

// CRITICAL RULES:
// 1. Ask ONE question at a time about missing requirements
// 2. NEVER repeat a question that has already been asked
// 3. Keep track of what information you already have from previous answers
// 4. When you have gathered enough information about: tech_stack, domain, entity_model, operations_required, non_functional_requirements, constraints, and input_output_spec - say "I am ready to generate the final description. Shall I proceed?"

// Requirement categories to cover:
// - tech_stack: Programming languages, frameworks, databases
// - domain: Industry/application type (e.g., e-commerce, healthcare)
// - entity_model: Main entities and their relationships
// - operations_required: CRUD operations, authentication, validations
// - non_functional_requirements: Performance, scalability, security
// - constraints: Budget, timeline, platform limitations
// - input_output_spec: Input/output formats, APIs

// Be conversational and helpful. If the user gives partial information, acknowledge it and ask about missing details.`;

let SYSTEM_PROMPT = `
You are an AI assistant that helps create COMPILER-BASED CODING PROBLEMS
(similar to competitive programming / coding platforms).

The problem can be:
- Scenario-based (story-driven)
- Straightforward algorithmic
- Real-world inspired
- Data-structure or algorithm focused

Your goal is to gather COMPLETE requirements before generating the final problem.

CRITICAL RULES:
1. Ask ONE question at a time.
2. NEVER repeat a question already asked.
3. Respect previously gathered answers.
4. When you have enough information about:
   - problem_type
   - difficulty
   - topic
   - constraints
   - input_output_spec
   Say exactly:
   "I am ready to generate the final coding problem. Shall I proceed?"

Requirement categories:
- problem_type: Scenario-based or Direct problem
- difficulty: Easy / Medium / Hard
- topic: Arrays, Strings, DP, Graphs, Trees, Math, Greedy, Bit Manipulation, etc.
- constraints: Time complexity, space limits, input size limits
- input_output_spec: Exact input format and output format
- edge_cases: Special conditions to test

Be precise, structured, and exam-oriented.
`;

SYSTEM_PROMPT += `
When you ask clarifying questions, you MUST output JSON only.

Question format:
{
  "type": "question",
  "question": "<question text>",
  "options": ["opt1", "opt2"]
}

Text format:
{
  "type": "text",
  "content": "<message>"
}

Rules:
- JSON only. No extra text.
- ONE question at a time.
- Options should be short and selectable.
`;


serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, memory, action } = await req.json();
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") || "";
    const AZURE_ENDPOINT = Deno.env.get("AZURE_OPENAI_ENDPOINT") || "https://iamneo-qb.openai.azure.com/";
    const AZURE_API_KEY = Deno.env.get("AZURE_OPENAI_API_KEY") || "";
    const AZURE_DEPLOYMENT = Deno.env.get("AZURE_OPENAI_DEPLOYMENT") || "gpt-5-mini";
    const AZURE_API_VERSION = "2024-12-01-preview";

    if (!AZURE_ENDPOINT || !AZURE_API_KEY) {
      throw new Error("Azure OpenAI endpoint or API key missing");
    }
    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    async function fetchDescriptionTemplate(templateName = "default_format") {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE");

      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/problem_description_templates?name=eq.${templateName}&select=*`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
        }
      );

      const data = await res.json();
      return data[0]?.description_format || null;
    }


    let systemPrompt = SYSTEM_PROMPT;

    if (memory) {
    const memoryContext = `
Current gathered information:
- Questions already asked: ${memory.questions_asked.join(", ") || "None yet"}
- User answers: ${JSON.stringify(memory.user_answers) || "{}"}
- Ready to generate: ${memory.ready_to_generate}

DO NOT ask about topics already covered.
`;

      systemPrompt += memoryContext;
    }

    if (action === "generate_description") {
      const template = await fetchDescriptionTemplate("default_format");

      systemPrompt = `
You are generating a COMPILER-READY CODING PROBLEM.

Create a professional problem statement with the following sections:

1. **Problem Title**
2. **Difficulty Level**
3. **Topic(s)**
4. **Problem Description**
   - Clear explanation
   - Scenario-based OR direct based on user choice
5. **Input Format**
6. **Output Format**
7. **Constraints**
8. **Sample Input**
1. **Problem Title**
2. **Difficulty Level**
3. **Topic(s)**
4. **Problem Description**
   - Clear explanation
   - Scenario-based OR direct based on user choice
5. **Input Format**
6. **Output Format**
7. **Constraints**
8. **Sample Input**
9. **Sample Output**
10. **Explanation**
11. **Edge Cases to Consider**
12. **Testcase Categories with Weightage**

### Testcase Categories Format:
- Sample Testcases (10%)
- Basic Functional Testcases (30%)
- Boundary Testcases (20%)
- Edge Case Testcases (20%)
- Stress / Performance Testcases (20%)

TEMPLATE (HTML):
${template}

RULES:
- Replace all placeholders: {{overview}}, {{model}}, {{service}}, etc.
- Output must be ONLY the HTML content (no markdown, no commentary).
- Follow competitive programming standards.
- Problem must be unambiguous and executable.
- Inputs and outputs must be compiler-friendly.
- Difficulty must match constraints and logic.
- Paraphrase and enhance user inputs by at least 10%.

Use these gathered inputs:
${JSON.stringify(memory?.user_answers || {}, null, 2)}

IMPORTANT:
- Do NOT include solution.
- Do NOT include hints.
- Do NOT include code.
- This is a PROBLEM STATEMENT ONLY.
`;
}


    
    const url =
      `${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}/chat/completions?api-version=${AZURE_API_VERSION}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "api-key": AZURE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AZURE_DEPLOYMENT,
        stream: true,
        max_completion_tokens: 4096,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", response.status, errorText);

      return new Response(JSON.stringify({ error: errorText }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- RETURN STREAM DIRECTLY (Your exact requirement) ----
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
