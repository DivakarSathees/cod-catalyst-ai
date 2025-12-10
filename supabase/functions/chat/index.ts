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
  "tech_stack",
  "domain",
  "entity_model",
  "operations_required",
  "non_functional_requirements",
  "constraints",
  "input_output_spec"
];

const SYSTEM_PROMPT = `You are an AI assistant helping users create detailed project descriptions for software applications. Your goal is to gather comprehensive requirements by asking clarifying questions.

CRITICAL RULES:
1. Ask ONE question at a time about missing requirements
2. NEVER repeat a question that has already been asked
3. Keep track of what information you already have from previous answers
4. When you have gathered enough information about: tech_stack, domain, entity_model, operations_required, non_functional_requirements, constraints, and input_output_spec - say "I am ready to generate the final description. Shall I proceed?"

Requirement categories to cover:
- tech_stack: Programming languages, frameworks, databases
- domain: Industry/application type (e.g., e-commerce, healthcare)
- entity_model: Main entities and their relationships
- operations_required: CRUD operations, authentication, validations
- non_functional_requirements: Performance, scalability, security
- constraints: Budget, timeline, platform limitations
- input_output_spec: Input/output formats, APIs

Be conversational and helpful. If the user gives partial information, acknowledge it and ask about missing details.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, memory, action } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = SYSTEM_PROMPT;
    
    if (memory) {
      const memoryContext = `
Current gathered information:
- Questions already asked: ${memory.questions_asked.join(", ") || "None yet"}
- User answers: ${JSON.stringify(memory.user_answers) || "{}"}
- Ready to generate: ${memory.ready_to_generate}

DO NOT ask about topics you already have information on. Ask about remaining missing categories.`;
      systemPrompt += memoryContext;
    }

    if (action === "generate_description") {
      systemPrompt = `You are generating a detailed project description based on gathered requirements.

Create a comprehensive, professional project description with the following sections:
1. **Overview** - High-level summary of the project
2. **Technical Requirements** - Tech stack, architecture, tools
3. **Functional Requirements** - Features, operations, user stories
4. **Non-functional Requirements** - Performance, security, scalability
5. **Constraints** - Limitations, dependencies, budget/timeline
6. **Expected Deliverables** - What will be produced

IMPORTANT: Make the description unique and professional. Do NOT write it like release notes. Write it as a problem specification document.

Use the gathered information to create a comprehensive description. Paraphrase and expand on the user's inputs to ensure at least 10% uniqueness.`;
    }

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
          ...messages,
        ],
        stream: true,
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
