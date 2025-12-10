import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Download, Settings, FileText, ChevronDown } from "lucide-react";
import { jsPDF } from "jspdf";

interface Testcase {
  id: string;
  category: string;
  test_id: string;
  description: string;
  steps: string;
  expected_input: string;
  expected_output: string;
}

const CATEGORY_NAMES: Record<string, string> = {
  file_existence: "File Existence Tests",
  method_existence: "Method Existence Tests",
  functional: "Functional Tests",
  end_to_end: "End-to-End Tests",
  api: "API Tests",
  database: "Database Tests",
  security: "Security Tests",
  performance: "Performance Tests",
  negative: "Negative Tests",
  boundary: "Boundary Tests",
};

export default function Testcases() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [testcases, setTestcases] = useState<Testcase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionTitle, setSessionTitle] = useState("Test Cases");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      fetchTestcases();
    };
    checkAuth();
  }, [sessionId, navigate]);

  const fetchTestcases = async () => {
    if (!sessionId) return;

    try {
      const { data: testcaseData, error: testcaseError } = await supabase
        .from("generated_testcases")
        .select("*")
        .eq("session_id", sessionId)
        .order("category", { ascending: true })
        .order("test_id", { ascending: true });

      if (testcaseError) throw testcaseError;
      setTestcases(testcaseData || []);

      const { data: sessionData } = await supabase
        .from("chat_sessions")
        .select("title")
        .eq("id", sessionId)
        .single();

      if (sessionData) setSessionTitle(sessionData.title);
    } catch (error) {
      console.error("Error fetching testcases:", error);
      toast({ title: "Error", description: "Failed to load test cases.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const groupedTestcases = testcases.reduce((acc, tc) => {
    if (!acc[tc.category]) acc[tc.category] = [];
    acc[tc.category].push(tc);
    return acc;
  }, {} as Record<string, Testcase[]>);

  const downloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;
    const lineHeight = 7;
    const margin = 15;
    const maxWidth = pageWidth - margin * 2;

    // Title
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(`Test Cases: ${sessionTitle}`, margin, yPos);
    yPos += lineHeight * 2;

    // Summary
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Test Cases: ${testcases.length}`, margin, yPos);
    yPos += lineHeight;
    doc.text(`Categories: ${Object.keys(groupedTestcases).length}`, margin, yPos);
    yPos += lineHeight * 2;

    // Categories
    Object.entries(groupedTestcases).forEach(([category, tests]) => {
      // Check if we need a new page
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }

      // Category header
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(`${CATEGORY_NAMES[category] || category} (${tests.length})`, margin, yPos);
      yPos += lineHeight * 1.5;

      // Test cases
      tests.forEach((tc) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`${tc.test_id}: ${tc.description}`, margin, yPos);
        yPos += lineHeight;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");

        if (tc.steps) {
          const stepsLines = doc.splitTextToSize(`Steps: ${tc.steps}`, maxWidth);
          stepsLines.forEach((line: string) => {
            if (yPos > 280) {
              doc.addPage();
              yPos = 20;
            }
            doc.text(line, margin, yPos);
            yPos += lineHeight * 0.8;
          });
        }

        if (tc.expected_input) {
          const inputLines = doc.splitTextToSize(`Input: ${tc.expected_input}`, maxWidth);
          inputLines.forEach((line: string) => {
            if (yPos > 280) {
              doc.addPage();
              yPos = 20;
            }
            doc.text(line, margin, yPos);
            yPos += lineHeight * 0.8;
          });
        }

        if (tc.expected_output) {
          const outputLines = doc.splitTextToSize(`Expected: ${tc.expected_output}`, maxWidth);
          outputLines.forEach((line: string) => {
            if (yPos > 280) {
              doc.addPage();
              yPos = 20;
            }
            doc.text(line, margin, yPos);
            yPos += lineHeight * 0.8;
          });
        }

        yPos += lineHeight;
      });

      yPos += lineHeight;
    });

    doc.save(`testcases-${sessionId?.slice(0, 8)}.pdf`);
    toast({ title: "Downloaded", description: "Test cases exported as PDF." });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-subtle flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading test cases...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-subtle">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-semibold">{sessionTitle}</h1>
              <p className="text-xs text-muted-foreground">{testcases.length} test cases generated</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/configure-testcases/${sessionId}`)}>
              <Settings className="w-4 h-4 mr-2" />
              Reconfigure
            </Button>
            <Button onClick={downloadPDF} className="gradient-primary shadow-elegant">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {testcases.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">No Test Cases Yet</h3>
              <p className="text-muted-foreground mb-4">Configure and generate test cases to see them here.</p>
              <Button onClick={() => navigate(`/configure-testcases/${sessionId}`)}>
                <Settings className="w-4 h-4 mr-2" />
                Configure Testcases
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="multiple" defaultValue={Object.keys(groupedTestcases)} className="space-y-4">
            {Object.entries(groupedTestcases).map(([category, tests]) => (
              <AccordionItem key={category} value={category} className="border-none">
                <Card className="shadow-card border-border/50">
                  <AccordionTrigger className="px-6 py-4 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{CATEGORY_NAMES[category] || category}</span>
                      <Badge variant="secondary">{tests.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="px-6 pb-4 space-y-4">
                      {tests.map((tc) => (
                        <div key={tc.id} className="p-4 rounded-lg bg-muted/50 border border-border/50">
                          <div className="flex items-start gap-3 mb-3">
                            <Badge className="shrink-0 gradient-primary text-primary-foreground">{tc.test_id}</Badge>
                            <p className="font-medium">{tc.description}</p>
                          </div>
                          {tc.steps && (
                            <div className="mb-2">
                              <span className="text-xs font-medium text-muted-foreground uppercase">Steps:</span>
                              <p className="text-sm mt-1 whitespace-pre-wrap">{tc.steps}</p>
                            </div>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                            {tc.expected_input && (
                              <div>
                                <span className="text-xs font-medium text-muted-foreground uppercase">Expected Input:</span>
                                <p className="text-sm mt-1">{tc.expected_input}</p>
                              </div>
                            )}
                            {tc.expected_output && (
                              <div>
                                <span className="text-xs font-medium text-muted-foreground uppercase">Expected Output:</span>
                                <p className="text-sm mt-1">{tc.expected_output}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </Card>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </main>
    </div>
  );
}
