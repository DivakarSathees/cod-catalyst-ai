import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Copy, Edit, TestTube, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function ProjectDescription() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [description, setDescription] = useState("");
  const [sessionTitle, setSessionTitle] = useState("Project Description");
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      fetchDescription();
    };
    checkAuth();
  }, [sessionId, navigate]);

  const fetchDescription = async () => {
    if (!sessionId) return;
    
    try {
      const { data: descData, error: descError } = await supabase
        .from("project_descriptions")
        .select("full_description")
        .eq("session_id", sessionId)
        .single();

      if (descError) throw descError;
      setDescription(descData.full_description);

      const { data: sessionData } = await supabase
        .from("chat_sessions")
        .select("title")
        .eq("id", sessionId)
        .single();
      
      if (sessionData) setSessionTitle(sessionData.title);
    } catch (error) {
      console.error("Error fetching description:", error);
      toast({ title: "Error", description: "Failed to load project description.", variant: "destructive" });
      navigate("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(description);
      setCopied(true);
      toast({ title: "Copied!", description: "Description copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({ title: "Error", description: "Failed to copy to clipboard.", variant: "destructive" });
    }
  };

  const goToTestcaseConfig = () => {
    navigate(`/configure-testcases/${sessionId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-subtle flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading description...</div>
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
              <p className="text-xs text-muted-foreground">Project Description</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/chat/${sessionId}`)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button onClick={goToTestcaseConfig} className="gradient-primary shadow-elegant">
              <TestTube className="w-4 h-4 mr-2" />
              Configure Testcases
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="shadow-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Generated Project Description</CardTitle>
            <Button variant="outline" size="sm" onClick={copyToClipboard}>
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {/* <ReactMarkdown>{description}</ReactMarkdown> */}
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: description }}
              />

            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
