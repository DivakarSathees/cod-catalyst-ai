// import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// const corsHeaders = {
//   "Access-Control-Allow-Origin": "*",
//   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
// };

// interface ChatMessage {
//   role: "user" | "assistant" | "system";
//   content: string;
// }

// interface ChatMemory {
//   questions_asked: string[];
//   user_answers: Record<string, string>;
//   ready_to_generate: boolean;
// }

// const REQUIREMENT_CATEGORIES = [
//   "tech_stack",
//   "domain",
//   "entity_model",
//   "operations_required",
//   "non_functional_requirements",
//   "constraints",
//   "input_output_spec"
// ];

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

// serve(async (req) => {
//   if (req.method === "OPTIONS") {
//     return new Response(null, { headers: corsHeaders });
//   }

//   try {
//     const { messages, memory, action } = await req.json();
//     const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
//     if (!LOVABLE_API_KEY) {
//       throw new Error("LOVABLE_API_KEY is not configured");
//     }

//     let systemPrompt = SYSTEM_PROMPT;
    
//     if (memory) {
//       const memoryContext = `
// Current gathered information:
// - Questions already asked: ${memory.questions_asked.join(", ") || "None yet"}
// - User answers: ${JSON.stringify(memory.user_answers) || "{}"}
// - Ready to generate: ${memory.ready_to_generate}

// DO NOT ask about topics you already have information on. Ask about remaining missing categories.`;
//       systemPrompt += memoryContext;
//     }

//     if (action === "generate_description") {
//       systemPrompt = `You are generating a detailed project description based on gathered requirements.

// Create a comprehensive, professional project description with the following sections:
// 1. **Overview** - High-level summary of the project
// 2. **Technical Requirements** - Tech stack, architecture, tools
// 3. **Functional Requirements** - Features, operations, user stories
// 4. **Non-functional Requirements** - Performance, security, scalability
// 5. **Constraints** - Limitations, dependencies, budget/timeline
// 6. **Expected Deliverables** - What will be produced

// IMPORTANT: Make the description unique and professional. Do NOT write it like release notes. Write it as a problem specification document.

// Use the gathered information to create a comprehensive description. Paraphrase and expand on the user's inputs to ensure at least 10% uniqueness.`;
//     }

//     const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${LOVABLE_API_KEY}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         model: "google/gemini-2.5-flash",
//         messages: [
//           { role: "system", content: systemPrompt },
//           ...messages,
//         ],
//         stream: true,
//       }),
//     });

//     if (!response.ok) {
//       if (response.status === 429) {
//         return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
//           status: 429,
//           headers: { ...corsHeaders, "Content-Type": "application/json" },
//         });
//       }
//       if (response.status === 402) {
//         return new Response(JSON.stringify({ error: "Payment required. Please add credits to continue." }), {
//           status: 402,
//           headers: { ...corsHeaders, "Content-Type": "application/json" },
//         });
//       }
//       const errorText = await response.text();
//       console.error("AI gateway error:", response.status, errorText);
//       return new Response(JSON.stringify({ error: "AI service error" }), {
//         status: 500,
//         headers: { ...corsHeaders, "Content-Type": "application/json" },
//       });
//     }

//     return new Response(response.body, {
//       headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
//     });
//   } catch (error) {
//     console.error("Chat function error:", error);
//     return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
//       status: 500,
//       headers: { ...corsHeaders, "Content-Type": "application/json" },
//     });
//   }
// });


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

let SYSTEM_PROMPT = `You are an AI assistant helping users create detailed project descriptions for ANY type of software application — not limited to CRUD apps.  
The project may involve APIs, real-time systems, AI/ML features, DevTools, automation, agents, data pipelines, streaming, games, dashboards, or any other type of application.

Your goal is to gather complete requirements by asking clarifying questions.

CRITICAL RULES:
1. Ask ONE question at a time about missing requirements.
2. NEVER repeat a question that has already been asked.
3. Keep track of what information the user has already provided.
4. When you have gathered enough information about:  
   - tech_stack  
   - domain  
   - entity_model  
   - operations_required  
   - input_output_spec  
   Say: "I am ready to generate the final description. Shall I proceed?"

Requirement categories to cover:
- tech_stack: Programming languages, frameworks, databases, AI models, DevOps tools, runtime environment.
- domain: Industry / problem space (e.g., finance automation, AI assistants, IoT control system, gaming, analytics).
- entity_model: Key objects/data structures involved, including systems, ML models, users, roles, datasets, events, etc.
- operations_required: Core functionality or capabilities (not limited to CRUD). Can include workflows, predictions, automation steps, API behavior, background jobs, real-time logic, event handling, etc.
- input_output_spec: Input formats, output formats, API structure, UI flow, data types, file formats, streaming behavior, etc.

Be conversational and helpful.  
If the user gives partial information, acknowledge it and ask about only the *remaining* missing areas.`;

SYSTEM_PROMPT += `You are an assistant that gathers requirements for a software project. When you ask clarifying questions to the user, you MUST output a JSON object as the assistant message content (no extra commentary) with the following schema:


1) For questions with selectable options:
{
"type": "question",
"question": "<a short question string>",
"options": ["opt1", "opt2", "opt3"]
}


2) For plain text assistant messages (explanations, follow-ups):
{
"type": "text",
"content": "<assistant text here>"
}


Rules:
- When you generate a question, DO NOT include any text outside the JSON. The message content must be valid JSON only.
- Ask ONE question at a time.
- DO NOT repeat questions you've already asked (the client sends memory you must respect).
- Use 'type': 'question' for prompts that expect a choice or quick-reply. Use 'type': 'text' for normal paragraphs.
- If you need free-form input, you can send a 'question' with no options, expecting the user to type.
- The client will display the JSON's 'question' and 'options' as selectable buttons. Use options that are short strings.`;


serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, memory, action } = await req.json();
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") || "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";
    const AZURE_ENDPOINT = Deno.env.get("AZURE_OPENAI_ENDPOINT") || "https://iamneo-qb.openai.azure.com/";
    const AZURE_API_KEY = Deno.env.get("AZURE_OPENAI_API_KEY") || "BseWgixIxbzsRMTI9XcdwIS39aVLQT791lDu1gi3rBBFngSSOH7vJQQJ99BIACYeBjFXJ3w3AAABACOGv3VO";
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

DO NOT ask about topics you already have information on. Ask about remaining missing categories.`;
      systemPrompt += memoryContext;
    }

//     if (action === "generate_description") {
//       systemPrompt = `You are generating a detailed project description based on gathered requirements.

// Create a comprehensive, professional project description with the following sections:
// 1. **Overview** - High-level summary of the project
// 2. **Technical Requirements** - Tech stack, architecture, tools
// 3. **Functional Requirements** - Features, operations, user stories
// 4. **Non-functional Requirements** - Performance, security, scalability
// 5. **Constraints** - Limitations, dependencies, budget/timeline
// 6. **Expected Deliverables** - What will be produced

// IMPORTANT: Make the description unique and professional. Do NOT write it like release notes. Write it as a problem specification document.

// Use the gathered information to create a comprehensive description. Paraphrase and expand on the user's inputs to ensure at least 10% uniqueness.`;
//     }

    // // ---- GROQ STREAM CALL (OpenAI-compatible) ----
    // const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    //   method: "POST",
    //   headers: {
    //     Authorization: `Bearer ${GROQ_API_KEY}`,
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({
    //     model: "openai/gpt-oss-120b", // You can change to "llama3-8b-8192"
    //     stream: true,
    //     messages: [
    //       { role: "system", content: systemPrompt },
    //       ...messages,
    //     ],
    //   }),
    // });

     // ----------------------------
    // AZURE OPENAI STREAM REQUEST
    // ----------------------------
    if (action === "generate_description") {
      const template = await fetchDescriptionTemplate("default_format");

      systemPrompt = `You are generating a detailed project description based on gathered requirements.

Create a comprehensive, professional project specification with the following sections:

1. **Overview**  
   High-level summary of what the system/application does.

2. **Technical Requirements**  
   Tech stack, architecture, frameworks, libraries, AI models, APIs, databases, DevOps tools, and runtime environment.

3. **Functional Requirements**  
   Core features, operations, workflows, and system behaviors (not limited to CRUD — can include automation, prediction, streaming, analytics, agents, etc.).

4. **Input/Output Specifications**  
   Data formats, API schemas, UI flows, request/response structures, file formats, event streams, etc.

5. **Project Folder Structure**  
   Provide a clean, professional folder structure based on the chosen tech stack.  
   - Must reflect real-world best practices.

You must generate the final problem description by filling the EXACT template below.

### TEMPLATE (HTML):
${template}

### RULES:
- Replace all placeholders: {{overview}}, {{model}}, {{service}}, etc.
- Output must be ONLY the HTML content (no markdown, no commentary).
- Follow formatting exactly.
- Use all gathered user answers:  
${JSON.stringify(memory?.user_answers || {}, null, 2)}

### GOAL:
Generate a polished, exam-ready problem description following the EXACT structure.


IMPORTANT RULES:
- The project can be ANY type of application: AI, automation, agents, ML pipelines, DevTools, real-time apps, dashboards, games, IoT, etc.
- Use all gathered requirement data.
- Paraphrase and elaborate the user's inputs to ensure at least 10% uniqueness.
- The folder structure must align with the selected tech stack and architecture style.`;
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
