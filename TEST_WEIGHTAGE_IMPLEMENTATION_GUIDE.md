# Test Case Weightage & Difficulty System

## Overview
Enhanced test case management with:
1. **Auto-balancing weightage** - Total always adds to 100%
2. **Difficulty levels** for individual test cases
3. **Sample tests** with 0 weight and no difficulty
4. **Visual weight distribution** display
5. **Scored test results** based on weightage

## Key Features

### 1. Test Case Types

**Sample Tests:**
- Weight: Always 0%
- Difficulty: None
- Purpose: Help users understand the problem
- Don't count towards score

**Regular Tests:**
- Weight: Auto-balanced to total 100%
- Difficulty: Easy, Medium, or Hard
- Purpose: Validate solution correctness
- Count towards final score

### 2. Auto-Balancing Logic

When you add/remove test cases:
```typescript
// Example with 3 regular tests:
Test 1: 33%
Test 2: 33%
Test 3: 34%  // Gets the remainder
Total: 100%

// When you add Test 4:
Test 1: 25%
Test 2: 25%
Test 3: 25%
Test 4: 25%
Total: 100%
```

### 3. Database Changes

Added to `problem_testcases` table:
```sql
difficulty_level TEXT CHECK (difficulty_level IN ('Easy', 'Medium', 'Hard') OR difficulty_level IS NULL),
weight INTEGER DEFAULT 10 CHECK (weight >= 0 AND weight <= 100),
```

## Implementation Changes

### Component Updates Needed

Add these functions to `SolutionEditor.tsx`:

```typescript
// 1. Update loadTestCases to auto-balance after loading
const loadTestCases = async () => {
    try {
        const { data, error } = await supabase
            .from("problem_testcases")
            .select("*")
            .eq("session_id", sessionId)
            .order("order_index");

        if (error) throw error;

        // Auto-balance weights
        const balanced = balanceWeightage(data || []);
        setTestCases(balanced);
    } catch (error) {
        console.error("Error loading test cases:", error);
    }
};

// 2. Update saveTestCase to include difficulty and auto-balance
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
                    difficulty_level: editingTestCase.is_sample ? null : editingTestCase.difficulty_level,
                    weight: editingTestCase.weight,
                    is_sample: editingTestCase.is_sample,
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
                difficulty_level: editingTestCase.is_sample ? null : editingTestCase.difficulty_level,
                weight: editingTestCase.is_sample ? 0 : editingTestCase.weight,
                is_sample: editingTestCase.is_sample,
                order_index: testCases.length,
            });

            if (error) throw error;
        }

        await loadTestCases(); // This will auto-balance
        setEditingTestCase(null);
        toast({ title: "Success", description: "Test case saved and weights auto-balanced" });
    } catch (error) {
        console.error("Error saving test case:", error);
        toast({ title: "Error", description: "Failed to save test case", variant: "destructive" });
    }
};

// 3. Update deleteTestCase to auto-balance after deletion
const deleteTestCase = async (id: string) => {
    try {
        const { error } = await supabase.from("problem_testcases").delete().eq("id", id);
        if (error) throw error;

        await loadTestCases(); // This will auto-balance remaining tests
        toast({ title: "Success", description: "Test case deleted and weights rebalanced" });
    } catch (error) {
        toast({ title: "Error", description: "Failed to delete test case", variant: "destructive" });
    }
};

// 4. Calculate score from test results
const calculateScore = (results: TestResult[]): number => {
    const scoredResults = results.filter(r => !r.isSample);
    if (scoredResults.length === 0) return 0;
    
    const totalScore = scoredResults.reduce((acc, result) => {
        const weight = result.weight || 0;
        const points = result.status === "passed" ? weight : 0;
        return acc + points;
    }, 0);
    
    return Math.round(totalScore);
};

// 5. Update runAllTests to include weights
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
                weight: testCase.weight,
                isSample: testCase.is_sample,
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
                weight: testCase.weight,
                isSample: testCase.is_sample,
            });
        }
    }

    setTestResults(results);
    setIsRunningTests(false);
    setActiveTab("results");

    const passed = results.filter(r => r.status === "passed").length;
    const score = calculateScore(results);
    
    toast({
        title: "Tests Complete",
        description: `${passed}/${results.length} tests passed | Score: ${score}/100`,
    });
};
```

### UI Updates for Test Case Editor

Add difficulty and weight display to the edit form:

```tsx
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

            {/* Sample Test Checkbox */}
            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="isSample"   
                    checked={editingTestCase.is_sample}
                    onChange={(e) => setEditingTestCase({ 
                        ...editingTestCase, 
                        is_sample: e.target.checked,
                        weight: e.target.checked ? 0 : 10,
                        difficulty_level: e.target.checked ? undefined : 'Easy'
                    })}
                    className="w-4 h-4"
                />
                <label htmlFor="isSample" className="text-sm">
                    Sample Test Case (no weight/difficulty)
                </label>
            </div>

            {/* Difficulty (only for non-sample tests) */}
            {!editingTestCase.is_sample && (
                <div>
                    <label className="text-xs font-medium mb-1 block">Difficulty Level</label>
                    <Select
                        value={editingTestCase.difficulty_level || "Easy"}
                        onValueChange={(val) => setEditingTestCase({ ...editingTestCase, difficulty_level: val })}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Easy">Easy</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Hard">Hard</SelectItem>
                        </SelectContent>
       </Select>
                </div>
            )}

            {/* Weight Display (read-only, auto-balanced) */}
            {!editingTestCase.is_sample && (
                <div>
                    <label className="text-xs font-medium mb-1 block">
                        Weight (auto-balanced)
                    </label>
                    <div className="px-3 py-2 bg-muted rounded-md text-sm">
                        {editingTestCase.weight}% (will be balanced on save)
                    </div>
                </div>
            )}

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
```

### UI Updates for Test Case List

Show weight and difficulty badges:

```tsx
{testCases.map((tc, index) => (
    <Card key={tc.id || index} className={tc.is_sample ? "border-blue-500/30" : ""}>
        <CardContent className="p-4">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium">{tc.test_name}</span>
                        
                        {/* Sample Badge */}
                        {tc.is_sample && (
                            <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                                Sample
                            </span>
                        )}
                        
                        {/* Category Badge */}
                        <span className="text-xs px-2 py-0.5 bg-muted rounded">
                            {tc.category}
                        </span>
                        
                        {/* Difficulty Badge (only for non-sample) */}
                        {!tc.is_sample && tc.difficulty_level && (
                            <span className={cn(
                                "text-xs px-2 py-0.5 rounded font-medium",
                                tc.difficulty_level === "Easy" && "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
                                tc.difficulty_level === "Medium" && "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
                                tc.difficulty_level === "Hard" && "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                            )}>
                                {tc.difficulty_level}
                            </span>
                        )}
                        
                        {/* Weight Badge (only for non-sample) */}
                        {!tc.is_sample && (
                            <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded font-medium">
                                {tc.weight}%
                            </span>
                        )}
                    </div>
                    {/* ... rest of test case display ... */}
                </div>
            </div>
        </CardContent>
    </Card>
))}
```

### UI Updates for Results Display

Show score and individual weights:

```tsx
<TabsContent value="results" className="space-y-4">
    {testResults.length > 0 && (
        <>
            {/* Score Summary */}
            <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm text-muted-foreground mb-1">Total Score</div>
                            <div className="text-4xl font-bold">{calculateScore(testResults)}/100</div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-muted-foreground mb-1">Tests Passed</div>
                            <div className="text-2xl font-semibold">
                                {passedTests}/{testResults.filter(r => !r.isSample).length}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Individual Results */}
            <div className="space-y-2">
                {testResults.map((result, index) => (
                    <Card key={index} className={cn(
                        result.status === "passed" && "border-green-500/50",
                        result.status === "failed" && "border-red-500/50",
                        (result.status === "error" || result.status === "timeout") && "border-orange-500/50",
                        result.isSample && "border-blue-500/50"
                    )}>
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    {result.status === "passed" && <CheckCircle className="w-5 h-5 text-green-500" />}
                                    {result.status === "failed" && <XCircle className="w-5 h-5 text-red-500" />}
                                    {(result.status === "error" || result.status === "timeout") && <XCircle className="w-5 h-5 text-orange-500" />}
                                    <span className="font-medium">{result.testName}</span>
                                    
                                    {/* Sample badge */}
                                    {result.isSample && (
                                        <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                                            Sample
                                        </span>
                                    )}
                                    
                                    {/* Weight badge */}
                                    {!result.isSample && result.weight !== undefined && (
                                        <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded font-medium">
                                            {result.status === "passed" ? "+" : ""}{result.status === "passed" ? result.weight : 0}%
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Clock className="w-3 h-3" />
                                    {result.executionTime}ms
                                </div>
                            </div>

                            {/* Error/Output comparison for failed tests */}
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
        </>
    )}
</TabsContent>
```

## Testing

1. **Add sample test** → Weight should be 0%, no difficulty
2. **Add regular test** → Auto-assigned 100%
3. **Add another regular test** → Both get 50% each
4. **Delete one test** → Remaining gets 100%
5. **Run tests** → See score out of 100

## Benefits

✅ Always balanced to 100%  
✅ Clear distinction between sample and scored tests  
✅ Visual weight distribution  
✅ Automatic rebalancing  
✅ Meaningful scores

---

**Status**: Ready to implement  
**Next**: Apply these changes to `SolutionEditor.tsx`
