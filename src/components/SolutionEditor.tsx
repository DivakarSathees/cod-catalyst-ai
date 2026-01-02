import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { CodeEditor } from "@/components/CodeEditor";
import {
    Sparkles,
    Play,
    Plus,
    Edit2,
    Trash2,
    Save,
    X,
    CheckCircle,
    XCircle,
    Clock,
    Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TestCase {
    id?: string;
    test_name: string;
    input_data: string;
    expected_output: string;
    category: string;
    difficulty_level?: string; // Easy, Medium, Hard (null for sample tests)
    weight: number; // 0-100, 0 for sample tests
    is_sample: boolean;
}

interface TestResult {
    testCaseId?: string;
    testName: string;
    status: "passed" | "failed" | "error" | "timeout";
    actualOutput: string;
    expectedOutput: string;
    executionTime: number;
    error?: string;
    weight?: number; // Weightage for scoring
    isSample?: boolean;
}

interface SolutionEditorProps {
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
        full_description: string;
    };
}

const LANGUAGES = [
    { value: "python", label: "Python", monacoLang: "python" },
    { value: "javascript", label: "JavaScript", monacoLang: "javascript" },
    { value: "typescript", label: "TypeScript", monacoLang: "typescript" },
    { value: "java", label: "Java", monacoLang: "java" },
    { value: "cpp", label: "C++", monacoLang: "cpp" },
    { value: "c", label: "C", monacoLang: "c" },
    { value: "go", label: "Go", monacoLang: "go" },
    { value: "rust", label: "Rust", monacoLang: "rust" },
];

const DEFAULT_CODE_TEMPLATES: Record<string, string> = {
    python: "# Write your solution here\ndef solution():\n    pass\n\nif __name__ == '__main__':\n    solution()",
    javascript: "// Write your solution here\nfunction solution() {\n    \n}\n\nsolution();",
    typescript: "// Write your solution here\nfunction solution(): void {\n    \n}\n\nsolution();",
    java: "public class Solution {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}",
    cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}",
    c: "#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}",
    go: "package main\n\nimport \"fmt\"\n\nfunc main() {\n    // Write your solution here\n}",
    rust: "fn main() {\n    // Write your solution here\n}",
};

// Auto-balance weightage for non-sample test cases
const balanceWeightage = (testCases: TestCase[]): TestCase[] => {
    const nonSampleTests = testCases.filter(tc => !tc.is_sample);
    const sampleTests = testCases.filter(tc => tc.is_sample);

    if (nonSampleTests.length === 0) return testCases;

    // Distribute 100% equally among non-sample tests
    const weightPerTest = Math.floor(100 / nonSampleTests.length);
    const remainder = 100 - (weightPerTest * nonSampleTests.length);

    const balancedNonSample = nonSampleTests.map((tc, index) => ({
        ...tc,
        weight: weightPerTest + (index < remainder ? 1 : 0)
    }));

    // Sample tests always have 0 weight
    const balancedSample = sampleTests.map(tc => ({
        ...tc,
        weight: 0,
        difficulty_level: undefined
    }));

    return [...balancedSample, ...balancedNonSample];
};


export function SolutionEditor({ sessionId, problemDescription }: SolutionEditorProps) {
    const [selectedLanguage, setSelectedLanguage] = useState("python");
    const [code, setCode] = useState(DEFAULT_CODE_TEMPLATES.python);
    const [customInput, setCustomInput] = useState(problemDescription.sampleInput || "");
    const [output, setOutput] = useState("");
    const [testCases, setTestCases] = useState<TestCase[]>([]);
    const [testResults, setTestResults] = useState<TestResult[]>([]);
    const [isGeneratingSolution, setIsGeneratingSolution] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [isRunningTests, setIsRunningTests] = useState(false);
    const [isGeneratingTests, setIsGeneratingTests] = useState(false);
    const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null);
    const [activeTab, setActiveTab] = useState("code");

    useEffect(() => {
        loadSolution();
        loadTestCases();
    }, [sessionId, selectedLanguage]);

    const loadSolution = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from("problem_solutions")
                .select("*")
                .eq("session_id", sessionId)
                .eq("language", selectedLanguage)
                .order("version", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error && error.code !== "PGRST116") throw error;

            if (data) {
                setCode(data.code);
            } else {
                setCode(DEFAULT_CODE_TEMPLATES[selectedLanguage] || "");
            }
        } catch (error) {
            console.error("Error loading solution:", error);
        }
    };

    const loadTestCases = async () => {
        try {
            const { data, error } = await supabase
                .from("problem_testcases")
                .select("*")
                .eq("session_id", sessionId)
                .order("order_index");

            if (error) throw error;

            setTestCases(data || []);
        } catch (error) {
            console.error("Error loading test cases:", error);
        }
    };

    const saveSolution = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // Get latest version
            const { data: latest } = await supabase
                .from("problem_solutions")
                .select("version")
                .eq("session_id", sessionId)
                .eq("language", selectedLanguage)
                .order("version", { ascending: false })
                .limit(1)
                .maybeSingle();

            const nextVersion = (latest?.version ?? 0) + 1;

            const { error } = await supabase.from("problem_solutions").insert({
                session_id: sessionId,
                user_id: user.id,
                language: selectedLanguage,
                code,
                version: nextVersion,
                is_ai_generated: false,
            });

            if (error) throw error;

            toast({ title: "Success", description: "Solution saved successfully" });
        } catch (error) {
            console.error("Error saving solution:", error);
            toast({ title: "Error", description: "Failed to save solution", variant: "destructive" });
        }
    };

    const generateSolution = async () => {
        setIsGeneratingSolution(true);
        try {
            console.log(problemDescription);

            const requestData = {
                problemDescription: problemDescription.full_description,
                language: selectedLanguage,
                difficulty: problemDescription.difficulty || "Medium",
            };

            console.log("=== Frontend: Generating Solution ===");
            console.log("Request data:", requestData);
            console.log("URL:", `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-solution`);

            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-solution`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                    },
                    body: JSON.stringify(requestData),
                }
            );

            console.log("Response status:", response.status);
            console.log("Response ok:", response.ok);

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Error response:", errorText);
                throw new Error(`Failed to generate solution: ${errorText}`);
            }

            const responseData = await response.json();
            console.log("Response data:", responseData);
            console.log("Solution:", responseData.solution);
            console.log("Solution length:", responseData.solution?.length);

            if (!responseData.solution || responseData.solution.trim() === "") {
                console.error("Empty solution received!");
                throw new Error("AI returned empty solution. Please check Edge Function logs.");
            }

            setCode(responseData.solution);
            toast({ title: "Success", description: "Solution generated successfully!" });
        } catch (error) {
            console.error("Error generating solution:", error);
            toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to generate solution", variant: "destructive" });
        } finally {
            setIsGeneratingSolution(false);
        }
    };

    const runCode = async () => {
        setIsRunning(true);
        setOutput("");
        try {
            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/execute-code`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                    },
                    body: JSON.stringify({
                        language: selectedLanguage,
                        code,
                        input: customInput,
                    }),
                }
            );

            const result = await response.json();

            if (result.status === "error") {
                setOutput(`Error:\n${result.error}`);
            } else if (result.status === "timeout") {
                setOutput("Time limit exceeded");
            } else {
                setOutput(result.output || "(no output)");
            }
        } catch (error) {
            console.error("Error running code:", error);
            setOutput("Error: Failed to execute code");
        } finally {
            setIsRunning(false);
        }
    };

    const runAllTests = async () => {
        if (testCases.length === 0) {
            toast({ title: "No test cases", description: "Generate or add test cases first" });
            return;
        }

        setIsRunningTests(true);
        setTestResults([]);
        const results: TestResult[] = [];

        for (const testCase of testCases) {
            try {
                const response = await fetch(
                    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/execute-code`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                        },
                        body: JSON.stringify({
                            language: selectedLanguage,
                            code,
                            input: testCase.input_data,
                        }),
                    }
                );

                const result = await response.json();

                const actualOutput = result.output?.trim() || "";
                const expectedOutput = testCase.expected_output.trim();
                const passed = actualOutput === expectedOutput;

                results.push({
                    testCaseId: testCase.id,
                    testName: testCase.test_name,
                    status: result.status === "error" ? "error" : result.status === "timeout" ? "timeout" : passed ? "passed" : "failed",
                    actualOutput,
                    expectedOutput,
                    executionTime: result.executionTime,
                    error: result.error,
                });
            } catch (error) {
                results.push({
                    testCaseId: testCase.id,
                    testName: testCase.test_name,
                    status: "error",
                    actualOutput: "",
                    expectedOutput: testCase.expected_output,
                    executionTime: 0,
                    error: "Failed to execute",
                });
            }
        }

        setTestResults(results);
        setIsRunningTests(false);
        setActiveTab("results");

        const passed = results.filter(r => r.status === "passed").length;
        toast({
            title: "Tests Complete",
            description: `${passed}/${results.length} tests passed`,
        });
    };

    const generateTestCases = async () => {
        setIsGeneratingTests(true);
        try {
            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-testcases`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                    },
                    body: JSON.stringify({
                        problemDescription: problemDescription.problemDescription,
                        inputFormat: problemDescription.inputFormat,
                        outputFormat: problemDescription.outputFormat,
                        constraints: problemDescription.constraints,
                        sampleInput: problemDescription.sampleInput,
                        sampleOutput: problemDescription.sampleOutput,
                        count: 5,
                    }),
                }
            );

            if (!response.ok) throw new Error("Failed to generate test cases");

            const { testCases: generatedTests } = await response.json();

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const testsToInsert = generatedTests.map((tc: any, index: number) => ({
                session_id: sessionId,
                user_id: user.id,
                test_name: tc.testName,
                input_data: tc.input,
                expected_output: tc.expectedOutput,
                test_category: tc.category || "basic",
                weight: tc.weight || 10,
                is_sample: tc.category === "sample",
                order_index: testCases.length + index,
            }));

            const { error } = await supabase.from("problem_testcases").insert(testsToInsert);
            if (error) throw error;

            await loadTestCases();
            toast({ title: "Success", description: `Generated ${generatedTests.length} test cases` });
        } catch (error) {
            console.error("Error generating test cases:", error);
            toast({ title: "Error", description: "Failed to generate test cases", variant: "destructive" });
        } finally {
            setIsGeneratingTests(false);
        }
    };

    const addTestCase = () => {
        setEditingTestCase({
            test_name: "New Test Case",
            input_data: "",
            expected_output: "",
            category: "custom",
            weight: 10,
            is_sample: false,
        });
    };

    const saveTestCase = async () => {
        if (!editingTestCase) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            if (editingTestCase.id) {
                // Update existing
                const { error } = await supabase
                    .from("problem_testcases")
                    .update({
                        test_name: editingTestCase.test_name,
                        input_data: editingTestCase.input_data,
                        expected_output: editingTestCase.expected_output,
                        test_category: editingTestCase.category,
                        weight: editingTestCase.weight,
                    })
                    .eq("id", editingTestCase.id);

                if (error) throw error;
            } else {
                // Insert new
                const { error } = await supabase.from("problem_testcases").insert({
                    session_id: sessionId,
                    user_id: user.id,
                    test_name: editingTestCase.test_name,
                    input_data: editingTestCase.input_data,
                    expected_output: editingTestCase.expected_output,
                    test_category: editingTestCase.category,
                    weight: editingTestCase.weight,
                    is_sample: editingTestCase.is_sample,
                    order_index: testCases.length,
                });

                if (error) throw error;
            }

            await loadTestCases();
            setEditingTestCase(null);
            toast({ title: "Success", description: "Test case saved" });
        } catch (error) {
            console.error("Error saving test case:", error);
            toast({ title: "Error", description: "Failed to save test case", variant: "destructive" });
        }
    };

    const deleteTestCase = async (id: string) => {
        try {
            const { error } = await supabase.from("problem_testcases").delete().eq("id", id);
            if (error) throw error;

            await loadTestCases();
            toast({ title: "Success", description: "Test case deleted" });
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete test case", variant: "destructive" });
        }
    };

    const passedTests = testResults.filter(r => r.status === "passed").length;
    const failedTests = testResults.filter(r => r.status === "failed").length;
    const errorTests = testResults.filter(r => r.status === "error" || r.status === "timeout").length;

    return (
        <div className="space-y-6">
            {/* Header with language selector and actions */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <label className="text-sm font-medium">Language:</label>
                    <Select value={selectedLanguage} onValueChange={(val) => {
                        setSelectedLanguage(val);
                        setCode(DEFAULT_CODE_TEMPLATES[val] || "");
                    }}>
                        <SelectTrigger className="w-48">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {LANGUAGES.map((lang) => (
                                <SelectItem key={lang.value} value={lang.value}>
                                    {lang.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex gap-2">
                    <Button
                        onClick={generateSolution}
                        disabled={isGeneratingSolution}
                        variant="outline"
                        className="gap-2"
                    >
                        {isGeneratingSolution ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Sparkles className="w-4 h-4" />
                        )}
                        Generate Solution
                    </Button>
                    <Button onClick={saveSolution} variant="outline" className="gap-2">
                        <Save className="w-4 h-4" />
                        Save
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="code">Code</TabsTrigger>
                    <TabsTrigger value="testcases">
                        Test Cases ({testCases.length})
                    </TabsTrigger>
                    <TabsTrigger value="results">
                        Results {testResults.length > 0 && `(${passedTests}/${testResults.length})`}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="code" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Code Editor</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <CodeEditor
                                value={code}
                                onChange={(val) => setCode(val || "")}
                                language={LANGUAGES.find(l => l.value === selectedLanguage)?.monacoLang || "python"}
                                height="500px"
                            />
                        </CardContent>
                    </Card>

                    {/* Input/Output */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Custom Input</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Textarea
                                    value={customInput}
                                    onChange={(e) => setCustomInput(e.target.value)}
                                    placeholder="Enter custom input..."
                                    className="font-mono text-sm min-h-[150px] bg-[#1e1e1e] text-green-400 border-gray-700"
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Output</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="font-mono text-sm min-h-[150px] p-3 bg-[#1e1e1e] text-green-400 border border-gray-700 rounded-md whitespace-pre-wrap">
                                    {output || "(output will appear here)"}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex gap-2 justify-end">
                        <Button onClick={runCode} disabled={isRunning} className="gap-2">
                            {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                            Run Code
                        </Button>
                        <Button onClick={runAllTests} disabled={isRunningTests || testCases.length === 0} className="gap-2">
                            {isRunningTests ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                            Run All Tests
                        </Button>
                    </div>
                </TabsContent>

                <TabsContent value="testcases" className="space-y-4">
                    <div className="flex gap-2 justify-end">
                        <Button onClick={generateTestCases} disabled={isGeneratingTests} variant="outline" className="gap-2">
                            {isGeneratingTests ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            Generate Tests
                        </Button>
                        <Button onClick={addTestCase} className="gap-2">
                            <Plus className="w-4 h-4" />
                            Add Test Case
                        </Button>
                    </div>

                    {editingTestCase && (
                        <Card className="border-primary">
                            <CardHeader>
                                <CardTitle className="text-sm flex items-center justify-between">
                                    {editingTestCase.id ? "Edit Test Case" : "New Test Case"}
                                    <Button onClick={() => setEditingTestCase(null)} variant="ghost" size="sm">
                                        <X className="w-4 h-4" />
                                    </Button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div>
                                    <label className="text-xs font-medium mb-1 block">Test Name</label>
                                    <input
                                        type="text"
                                        value={editingTestCase.test_name}
                                        onChange={(e) => setEditingTestCase({ ...editingTestCase, test_name: e.target.value })}
                                        className="w-full px-3 py-2 bg-background border rounded-md text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block">Input Data</label>
                                    <Textarea
                                        value={editingTestCase.input_data}
                                        onChange={(e) => setEditingTestCase({ ...editingTestCase, input_data: e.target.value })}
                                        className="font-mono text-sm"
                                        rows={3}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block">Expected Output</label>
                                    <Textarea
                                        value={editingTestCase.expected_output}
                                        onChange={(e) => setEditingTestCase({ ...editingTestCase, expected_output: e.target.value })}
                                        className="font-mono text-sm"
                                        rows={3}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={saveTestCase} className="gap-2">
                                        <Save className="w-4 h-4" />
                                        Save
                                    </Button>
                                    <Button onClick={() => setEditingTestCase(null)} variant="outline">
                                        Cancel
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="space-y-2">
                        {testCases.map((tc, index) => (
                            <Card key={tc.id || index}>
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-sm font-medium">{tc.test_name}</span>
                                                <span className="text-xs px-2 py-0.5 bg-muted rounded">
                                                    {tc.category}
                                                </span>
                                            </div>
                                            <div className="grid md:grid-cols-2 gap-2 text-xs">
                                                <div>
                                                    <div className="text-muted-foreground mb-1">Input:</div>
                                                    <pre className="bg-[#1e1e1e] text-green-400 p-2 rounded font-mono overflow-x-auto">
                                                        {tc.input_data}
                                                    </pre>
                                                </div>
                                                <div>
                                                    <div className="text-muted-foreground mb-1">Expected Output:</div>
                                                    <pre className="bg-[#1e1e1e] text-green-400 p-2 rounded font-mono overflow-x-auto">
                                                        {tc.expected_output}
                                                    </pre>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 ml-2">
                                            <Button
                                                onClick={() => setEditingTestCase(tc)}
                                                variant="ghost"
                                                size="sm"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                onClick={() => tc.id && deleteTestCase(tc.id)}
                                                variant="ghost"
                                                size="sm"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="results" className="space-y-4">
                    {testResults.length > 0 && (
                        <div className="grid grid-cols-3 gap-4">
                            <Card>
                                <CardContent className="p-4 flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                    <div>
                                        <div className="text-2xl font-bold">{passedTests}</div>
                                        <div className="text-xs text-muted-foreground">Passed</div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 flex items-center gap-2">
                                    <XCircle className="w-5 h-5 text-red-500" />
                                    <div>
                                        <div className="text-2xl font-bold">{failedTests}</div>
                                        <div className="text-xs text-muted-foreground">Failed</div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 flex items-center gap-2">
                                    <XCircle className="w-5 h-5 text-orange-500" />
                                    <div>
                                        <div className="text-2xl font-bold">{errorTests}</div>
                                        <div className="text-xs text-muted-foreground">Errors</div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    <div className="space-y-2">
                        {testResults.map((result, index) => (
                            <Card key={index} className={cn(
                                result.status === "passed" && "border-green-500/50",
                                result.status === "failed" && "border-red-500/50",
                                (result.status === "error" || result.status === "timeout") && "border-orange-500/50"
                            )}>
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            {result.status === "passed" && <CheckCircle className="w-5 h-5 text-green-500" />}
                                            {result.status === "failed" && <XCircle className="w-5 h-5 text-red-500" />}
                                            {(result.status === "error" || result.status === "timeout") && <XCircle className="w-5 h-5 text-orange-500" />}
                                            <span className="font-medium">{result.testName}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Clock className="w-3 h-3" />
                                            {result.executionTime}ms
                                        </div>
                                    </div>

                                    {result.status !== "passed" && (
                                        <div className="grid md:grid-cols-2 gap-3 text-xs">
                                            <div>
                                                <div className="text-muted-foreground mb-1">Expected:</div>
                                                <pre className="bg-[#1e1e1e] text-green-400 p-2 rounded font-mono overflow-x-auto">
                                                    {result.expectedOutput}
                                                </pre>
                                            </div>
                                            <div>
                                                <div className="text-muted-foreground mb-1">Actual:</div>
                                                <pre className="bg-[#1e1e1e] text-red-400 p-2 rounded font-mono overflow-x-auto">
                                                    {result.actualOutput || result.error || "(no output)"}
                                                </pre>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
