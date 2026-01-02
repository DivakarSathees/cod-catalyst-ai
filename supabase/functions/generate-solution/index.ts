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
        const { problemDescription, language, difficulty } = await req.json();

        const AZURE_ENDPOINT = Deno.env.get("AZURE_OPENAI_ENDPOINT") || "https://iamneo-qb.openai.azure.com/";
        const AZURE_API_KEY = Deno.env.get("AZURE_OPENAI_API_KEY") || "BseWgixIxbzsRMTI9XcdwIS39aVLQT791lDu1gi3rBBFngSSOH7vJQQJ99BIACYeBjFXJ3w3AAABACOGv3VO";
        const AZURE_DEPLOYMENT = Deno.env.get("AZURE_OPENAI_DEPLOYMENT") || "gpt-5-mini";
        const AZURE_API_VERSION = "2024-12-01-preview";

        if (!AZURE_ENDPOINT || !AZURE_API_KEY) {
            throw new Error("Azure OpenAI credentials missing");
        }

        const systemPrompt = `You are an expert programmer generating optimal solutions for coding problems.

Generate a ${language} solution that:
1. Is clean, efficient, and well-commented
2. Follows best practices for ${language}
3. Has appropriate time and space complexity for ${difficulty} difficulty
4. Includes error handling where necessary
5. Uses clear variable names and follows naming conventions

Output ONLY the code without any markdown formatting, explanations, or extra text.
Do NOT include \`\`\`${language} or \`\`\` markers.
Just the raw, executable code.`;

        const userPrompt = `Problem Description:\n${problemDescription}\n\nGenerate an optimal ${language} solution.`;

        const url = `${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}/chat/completions?api-version=${AZURE_API_VERSION}`;

        console.log("=== Generate Solution Request ===");
        console.log("URL:", url);
        console.log("Language:", language);
        console.log("Difficulty:", difficulty);

        const requestBody = {
            model: AZURE_DEPLOYMENT,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            max_completion_tokens: 2000,
            // temperature: 0.3,
        };

        console.log("Request body:", JSON.stringify(requestBody, null, 2));

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "api-key": AZURE_API_KEY,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
        });

        console.log("Response status:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Azure API error response:", errorText);
            throw new Error(`Azure API error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        console.log("=== Azure API Response ===");
        console.log("Full response:", JSON.stringify(data, null, 2));
        console.log("Choices array:", data.choices);
        console.log("First choice:", data.choices?.[0]);
        console.log("Message:", data.choices?.[0]?.message);
        console.log("Content:", data.choices?.[0]?.message?.content);

        // Try multiple paths to extract the solution
        let solution = "";

        if (data.choices && data.choices.length > 0) {
            const choice = data.choices[0];

            // Try different possible response structures
            solution = choice.message?.content ||
                choice.text ||
                choice.content ||
                "";
        }

        console.log("Extracted solution (before cleaning):", solution);

        if (!solution || solution.trim() === "") {
            console.error("No solution content found in response!");
            console.error("Full data structure:", JSON.stringify(data, null, 2));
            throw new Error("AI returned empty solution. Please try again.");
        }

        // Clean up any potential markdown formatting
        let cleanSolution = solution.trim();
        if (cleanSolution.startsWith("```")) {
            cleanSolution = cleanSolution
                .replace(/^```[a-z]*\n?/, "")
                .replace(/```\s*$/, "")
                .trim();
        }

        console.log("Final clean solution length:", cleanSolution.length);
        console.log("Final clean solution:", cleanSolution);

        return new Response(
            JSON.stringify({ solution: cleanSolution }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        console.error("Solution generation error:", error);
        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});
