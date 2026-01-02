import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExecuteRequest {
    language: string;
    code: string;
    input: string;
    timeLimit?: number;
    memoryLimit?: number;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { language, code, input, timeLimit = 5000, memoryLimit = 128 }: ExecuteRequest = await req.json();

        // Use Judge0 API or Piston API for code execution
        // For this example, I'll use Piston API (free and open source)
        const PISTON_API = "https://emkc.org/api/v2/piston";

        const languageMap: Record<string, string> = {
            python: "python",
            javascript: "javascript",
            typescript: "typescript",
            java: "java",
            cpp: "c++",
            c: "c",
            go: "go",
            rust: "rust",
            ruby: "ruby",
            php: "php",
            csharp: "csharp",
        };

        const pistonLanguage = languageMap[language.toLowerCase()] || language;

        const startTime = Date.now();

        const response = await fetch(`${PISTON_API}/execute`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                language: pistonLanguage,
                version: "*", // Use latest version
                files: [
                    {
                        name: `main.${getFileExtension(language)}`,
                        content: code,
                    },
                ],
                stdin: input,
                args: [],
                compile_timeout: 10000,
                run_timeout: timeLimit,
                compile_memory_limit: memoryLimit * 1024 * 1024,
                run_memory_limit: memoryLimit * 1024 * 1024,
            }),
        });

        const executionTime = Date.now() - startTime;

        if (!response.ok) {
            throw new Error("Code execution service unavailable");
        }

        const result = await response.json();

        // Format the result
        const output = result.run?.stdout || "";
        const stderr = result.run?.stderr || "";
        const compileOutput = result.compile?.stderr || "";
        const exitCode = result.run?.code || 0;

        let status: "success" | "error" | "timeout" = "success";
        let errorMessage = "";

        if (exitCode !== 0) {
            status = "error";
            errorMessage = stderr || compileOutput || "Runtime error";
        } else if (result.run?.signal === "SIGKILL") {
            status = "timeout";
            errorMessage = "Time limit exceeded";
        }

        return new Response(
            JSON.stringify({
                status,
                output: output.trim(),
                error: errorMessage,
                executionTime,
                memoryUsed: 0, // Piston doesn't provide memory usage
                exitCode,
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        console.error("Code execution error:", error);
        return new Response(
            JSON.stringify({
                status: "error",
                error: error instanceof Error ? error.message : "Unknown error",
                output: "",
                executionTime: 0,
            }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});

function getFileExtension(language: string): string {
    const extensions: Record<string, string> = {
        python: "py",
        javascript: "js",
        typescript: "ts",
        java: "java",
        cpp: "cpp",
        c: "c",
        go: "go",
        rust: "rs",
        ruby: "rb",
        php: "php",
        csharp: "cs",
    };
    return extensions[language.toLowerCase()] || "txt";
}
