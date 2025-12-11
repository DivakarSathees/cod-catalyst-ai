import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, TestTube, Loader2, AlertCircle } from "lucide-react";
import { Trash2, Edit, Save, X } from "lucide-react";

interface TestcaseCategory {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  weight: number;
}

interface GeneratedTestcase {
  id: string;
  session_id: string;
  user_id: string;
  category: string;
  test_id: string;
  description: string;
  steps: string;
  expected_input: string;
  expected_output: string;
}

const INITIAL_CATEGORIES: TestcaseCategory[] = [
  { id: "file_existence", name: "File Existence Tests", description: "Verify required files exist", enabled: false, weight: 10 },
  { id: "method_existence", name: "Method Existence Tests", description: "Verify methods are implemented", enabled: false, weight: 10 },
  { id: "functional", name: "Functional Tests", description: "Test return values and behavior", enabled: true, weight: 25 },
  { id: "end_to_end", name: "End-to-End Tests", description: "Complete user journey tests", enabled: false, weight: 15 },
  { id: "api", name: "API Tests", description: "REST/GraphQL endpoint testing", enabled: true, weight: 20 },
  { id: "database", name: "Database Tests", description: "CRUD operations, data integrity", enabled: false, weight: 10 },
  { id: "security", name: "Security Tests", description: "Auth, validation, XSS/CSRF", enabled: true, weight: 15 },
  { id: "performance", name: "Performance Tests", description: "Load, stress, response time", enabled: false, weight: 5 },
  { id: "negative", name: "Negative Tests", description: "Error handling, edge cases", enabled: true, weight: 15 },
  { id: "boundary", name: "Boundary Tests", description: "Min/max values, limits", enabled: false, weight: 10 },
];

export default function ConfigureTestcases() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<TestcaseCategory[]>(INITIAL_CATEGORIES);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [testcases, setTestcases] = useState<GeneratedTestcase[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState<Partial<GeneratedTestcase>>({});

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      loadExistingConfig();
      loadGeneratedTestcases();
    };
    checkAuth();
  }, [sessionId, navigate]);

  const loadExistingConfig = async () => {
    if (!sessionId) return;
    
    try {
      const { data } = await supabase
        .from("testcase_configs")
        .select("*")
        .eq("session_id", sessionId)
        .single();

      if (data) {
        setCategories((prev) =>
          prev.map((cat) => ({
            ...cat,
            enabled: data[cat.id as keyof typeof data] as boolean || false,
            weight: data[`${cat.id}_weight` as keyof typeof data] as number || cat.weight,
          }))
        );
      }
    } catch (error) {
      // No existing config, use defaults
    }
  };

  const loadGeneratedTestcases = async () => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("generated_testcases")
        .select("*")
        .eq("session_id", sessionId)
        .order("id", { ascending: true });

      if (error) throw error;
      setTestcases((data as GeneratedTestcase[]) || []);
    } catch (err) {
      console.error("Error loading testcases:", err);
      toast({ title: "Error", description: "Failed to load test cases.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const enabledCategories = categories.filter((c) => c.enabled);
  const totalWeight = enabledCategories.reduce((sum, c) => sum + c.weight, 0);
  const isValid = enabledCategories.length > 0 && totalWeight === 100;

  const toggleCategory = (id: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c))
    );
  };

  const updateWeight = (id: string, weight: number) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, weight } : c))
    );
  };

  const handleGenerate = async () => {
    if (!isValid || !sessionId) return;

    setIsGenerating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get project description
      const { data: descData, error: descError } = await supabase
        .from("project_descriptions")
        .select("full_description")
        .eq("session_id", sessionId)
        .single();

      if (descError) throw descError;

      // Save config
      const configData: Record<string, string | boolean | number> = {};
      categories.forEach((cat) => {
        configData[cat.id] = cat.enabled;
        configData[`${cat.id}_weight`] = cat.weight;
      });

      await supabase.from("testcase_configs").upsert({
        session_id: sessionId,
        user_id: user.id,
        ...configData,
      } as any);

      // Generate testcases via edge function
      const testcaseConfigs = enabledCategories.map((c) => ({
        category: c.id,
        weight: c.weight,
        enabled: true,
      }));

      const response = await supabase.functions.invoke("generate-testcases", {
        body: {
          projectDescription: descData.full_description,
          testcaseConfigs,
        },
      });

      if (response.error) throw new Error(response.error.message);

      const { testcases } = response.data;

      // Delete existing testcases for this session
      await supabase
        .from("generated_testcases")
        .delete()
        .eq("session_id", sessionId);

      // Save new testcases
      if (testcases && testcases.length > 0) {
        const testcaseRows = testcases.map((tc: any) => ({
          session_id: sessionId,
          user_id: user.id,
          category: tc.category,
          test_id: tc.test_id,
          description: tc.description,
          steps: tc.steps || "",
          expected_input: tc.expected_input || "",
          expected_output: tc.expected_output || "",
        }));

        await supabase.from("generated_testcases").insert(testcaseRows);
      }

      // Update session status
      await supabase
        .from("chat_sessions")
        .update({ status: "completed" })
        .eq("id", sessionId);

      toast({ title: "Success", description: "Test cases generated successfully!" });
      navigate(`/testcases/${sessionId}`);
    } catch (error) {
      console.error("Error generating testcases:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate test cases.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Testcase actions
  const startEdit = (tc: GeneratedTestcase) => {
    setEditingId(tc.id);
    setEditBuffer({ ...tc });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditBuffer({});
  };

  const saveEdit = async (id: string) => {
    try {
      const payload = {
        description: editBuffer.description || "",
        steps: editBuffer.steps || "",
        expected_input: editBuffer.expected_input || "",
        expected_output: editBuffer.expected_output || "",
      };

      const { error } = await supabase
        .from("generated_testcases")
        .update(payload)
        .eq("id", id as unknown as string);

      if (error) throw error;

      setTestcases((prev) => prev.map((t) => (t.id === id ? { ...t, ...payload } as GeneratedTestcase : t)));
      toast({ title: "Saved", description: "Test case updated." });
      cancelEdit();
    } catch (err) {
      console.error("Error saving testcase:", err);
      toast({ title: "Error", description: "Failed to save test case.", variant: "destructive" });
    }
  };

  const deleteTestcase = async (id: string) => {
    if (!confirm("Delete this test case?")) return;
    try {
  const { error } = await supabase.from("generated_testcases").delete().eq("id", id as unknown as string);
      if (error) throw error;
      setTestcases((prev) => prev.filter((t) => t.id !== id));
      toast({ title: "Deleted", description: "Test case removed." });
    } catch (err) {
      console.error("Error deleting testcase:", err);
      toast({ title: "Error", description: "Failed to delete test case.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen gradient-subtle">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/description/${sessionId}`)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-semibold">Configure Test Cases</h1>
              <p className="text-xs text-muted-foreground">Select categories and assign weights</p>
            </div>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={!isValid || isGenerating}
            className="gradient-primary shadow-elegant"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <TestTube className="w-4 h-4 mr-2" />
                Generate Testcases
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Weight indicator */}
        <Card className={`mb-6 ${isValid ? "border-emerald-500/50" : "border-amber-500/50"}`}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {!isValid && <AlertCircle className="w-5 h-5 text-amber-500" />}
                <span className="font-medium">
                  Total Weight: <span className={isValid ? "text-emerald-500" : "text-amber-500"}>{totalWeight}%</span>
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                {isValid ? "Ready to generate" : enabledCategories.length === 0 ? "Select at least one category" : "Must equal 100%"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Categories */}
        <div className="grid gap-4">
          {categories.map((category) => (
            <Card
              key={category.id}
              className={`transition-all ${
                category.enabled ? "border-primary/50 shadow-card" : "border-border/50 opacity-75"
              }`}
            >
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <Checkbox
                    id={category.id}
                    checked={category.enabled}
                    onCheckedChange={() => toggleCategory(category.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor={category.id} className="text-base font-medium cursor-pointer">
                        {category.name}
                      </Label>
                      {category.enabled && (
                        <span className="text-sm font-medium text-primary">{category.weight}%</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{category.description}</p>
                    {category.enabled && (
                      <Slider
                        value={[category.weight]}
                        onValueChange={([value]) => updateWeight(category.id, value)}
                        min={5}
                        max={50}
                        step={5}
                        className="w-full"
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Generated Testcases */}
        {/* <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Generated Testcases</h3>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading test cases...</p>
          ) : testcases.length === 0 ? (
            <p className="text-sm text-muted-foreground">No generated test cases yet.</p>
          ) : (
            <div className="space-y-4">
              {testcases.map((tc) => {
                const cat = categories.find((c) => c.id === tc.category);
                return (
                  <Card key={tc.id} className="relative">
                    <CardContent>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm text-muted-foreground">Category: {cat?.name || tc.category}</div>
                              <div className="font-medium">{tc.test_id}</div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Weight: <span className="font-medium">{cat?.weight ?? "-"}%</span>
                            </div>
                          </div>

                          <div className="mt-2">
                            {editingId === tc.id ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editBuffer.description as string || ""}
                                  onChange={(e) => setEditBuffer((b) => ({ ...b, description: e.target.value }))}
                                  className="w-full rounded border p-2"
                                  rows={3}
                                />
                                <input
                                  value={editBuffer.steps as string || ""}
                                  onChange={(e) => setEditBuffer((b) => ({ ...b, steps: e.target.value }))}
                                  className="w-full rounded border p-2"
                                  placeholder="Steps"
                                />
                                <input
                                  value={editBuffer.expected_input as string || ""}
                                  onChange={(e) => setEditBuffer((b) => ({ ...b, expected_input: e.target.value }))}
                                  className="w-full rounded border p-2"
                                  placeholder="Expected Input"
                                />
                                <input
                                  value={editBuffer.expected_output as string || ""}
                                  onChange={(e) => setEditBuffer((b) => ({ ...b, expected_output: e.target.value }))}
                                  className="w-full rounded border p-2"
                                  placeholder="Expected Output"
                                />
                                <div className="flex gap-2 mt-2">
                                  <Button size="sm" onClick={() => saveEdit(tc.id)}>
                                    <Save className="w-4 h-4 mr-2" /> Save
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={cancelEdit}>
                                    <X className="w-4 h-4 mr-2" /> Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-sm text-muted-foreground">{tc.description}</p>
                                <div className="mt-2 text-xs text-muted-foreground">
                                  <div>Steps: {tc.steps || "-"}</div>
                                  <div>Expected Input: {tc.expected_input || "-"}</div>
                                  <div>Expected Output: {tc.expected_output || "-"}</div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          {editingId !== tc.id ? (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => startEdit(tc as any)}>
                                <Edit className="w-4 h-4 mr-2" /> Edit
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => deleteTestcase(tc.id)}>
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div> */}
      </main>
    </div>
  );
}
