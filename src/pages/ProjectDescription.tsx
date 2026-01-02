import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Copy, Edit, TestTube, Check, Save, X, ChevronDown, ChevronUp, Code2 } from "lucide-react";
import { RichTextEditor } from "@/components/RichTextEditor";
import { parseDescription, textToHtml, type ParsedDescription } from "@/lib/descriptionParser";
import { cn } from "@/lib/utils";
import { SolutionEditor } from "@/components/SolutionEditor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


type ProjectDescriptionVersion = {
  id: string;
  version: number;
  full_description: string;
  created_at: string;
  problem_title?: string;
  difficulty_level?: string;
  topics?: string;
  problem_description?: string;
  input_format?: string;
  output_format?: string;
  constraints?: string;
  sample_input?: string;
  sample_output?: string;
  explanation?: string;
  edge_cases?: string;
  additional_notes?: string;
};


const DIFFICULTY_OPTIONS = ["Easy", "Medium", "Hard", "Expert"];

interface EditableSectionProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isEditing: boolean;
  minHeight?: string;
  readOnly?: boolean;
}

function EditableSection({
  label,
  value,
  onChange,
  isEditing,
  minHeight = "120px",
  readOnly = false,
}: EditableSectionProps) {
  return (
    <div className="mb-6">
      <label className="block text-sm font-bold text-foreground uppercase tracking-wide mb-2">
        {label}:
      </label>
      <RichTextEditor
        value={value}
        onChange={onChange}
        readOnly={!isEditing || readOnly}
        minHeight={minHeight}
        className="shadow-sm"
      />
    </div>
  );
}

export default function ProjectDescription() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [sessionTitle, setSessionTitle] = useState("Project Description");
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [versions, setVersions] = useState<ProjectDescriptionVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<ProjectDescriptionVersion | null>(null);

  // Parsed sections for editing
  const [parsedSections, setParsedSections] = useState<ParsedDescription>({
    problemTitle: "",
    difficultyLevel: "",
    topics: "",
    problemDescription: "",
    inputFormat: "",
    outputFormat: "",
    constraints: "",
    sampleInput: "",
    sampleOutput: "",
    explanation: "",
    edgeCases: "",
    additionalNotes: "",
    full_description: "",
  });

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    main: true,
    inputOutput: true,
    samples: true,
    additional: true,
  });

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
      const { data: descData, error } = await supabase
        .from("project_descriptions")
        .select(`
          id, 
          version, 
          full_description, 
          created_at,
          problem_title,
          difficulty_level,
          topics,
          problem_description,
          input_format,
          output_format,
          constraints,
          sample_input,
          sample_output,
          explanation,
          edge_cases,
          additional_notes
        `)
        .eq("session_id", sessionId)
        .order("version", { ascending: false })
        .returns<ProjectDescriptionVersion[]>();

      if (error) throw error;
      if (!descData || descData.length === 0) throw new Error("No descriptions found");
      console.log("Fetched descriptions:", descData);

      setVersions(descData);
      setActiveVersion(descData[0]);

      // Check if structured fields exist, otherwise parse from full_description
      if (descData[0].problem_title) {
        // Use structured fields directly
        setParsedSections({
          problemTitle: descData[0].problem_title || "",
          difficultyLevel: descData[0].difficulty_level || "",
          topics: descData[0].topics || "",
          problemDescription: descData[0].problem_description || "",
          inputFormat: descData[0].input_format || "",
          outputFormat: descData[0].output_format || "",
          constraints: descData[0].constraints || "",
          sampleInput: descData[0].sample_input || "",
          sampleOutput: descData[0].sample_output || "",
          explanation: descData[0].explanation || "",
          edgeCases: descData[0].edge_cases || "",
          additionalNotes: descData[0].additional_notes || "",
          full_description: descData[0].full_description || "",
        });
      } else {
        // Fallback: Parse the description into sections for backward compatibility
        const parsed = parseDescription(descData[0].full_description);
        setParsedSections({
          ...parsed,
          problemDescription: textToHtml(parsed.problemDescription),
          inputFormat: textToHtml(parsed.inputFormat),
          outputFormat: textToHtml(parsed.outputFormat),
          constraints: textToHtml(parsed.constraints),
          sampleInput: parsed.sampleInput,
          sampleOutput: parsed.sampleOutput,
          explanation: textToHtml(parsed.explanation),
          edgeCases: textToHtml(parsed.edgeCases),
          additionalNotes: textToHtml(parsed.additionalNotes),
        });
      }

      console.log("Parsed sections:", parsedSections);


      const { data: sessionData } = await supabase
        .from("chat_sessions")
        .select("title")
        .eq("id", sessionId)
        .single();

      if (sessionData) setSessionTitle(sessionData.title);
    } catch (error) {
      console.error("Error fetching description:", error);
      toast({
        title: "Error",
        description: "Failed to load project description versions.",
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVersionChange = (versionId: string) => {
    const selected = versions.find(v => v.id === versionId);
    if (selected) {
      setActiveVersion(selected);

      // Check if structured fields exist, otherwise parse
      if (selected.problem_title) {
        setParsedSections({
          problemTitle: selected.problem_title || "",
          difficultyLevel: selected.difficulty_level || "",
          topics: selected.topics || "",
          problemDescription: selected.problem_description || "",
          inputFormat: selected.input_format || "",
          outputFormat: selected.output_format || "",
          constraints: selected.constraints || "",
          sampleInput: selected.sample_input || "",
          sampleOutput: selected.sample_output || "",
          explanation: selected.explanation || "",
          edgeCases: selected.edge_cases || "",
          additionalNotes: selected.additional_notes || "",
          full_description: selected.full_description || "",
        });
      } else {
        // Fallback to parsing
        const parsed = parseDescription(selected.full_description);
        setParsedSections({
          ...parsed,
          problemDescription: textToHtml(parsed.problemDescription),
          inputFormat: textToHtml(parsed.inputFormat),
          outputFormat: textToHtml(parsed.outputFormat),
          constraints: textToHtml(parsed.constraints),
          sampleInput: parsed.sampleInput,
          sampleOutput: parsed.sampleOutput,
          explanation: textToHtml(parsed.explanation),
          edgeCases: textToHtml(parsed.edgeCases),
          additionalNotes: textToHtml(parsed.additionalNotes),
        });
      }
    }
  };

  const updateSection = (key: keyof ParsedDescription, value: string) => {
    setParsedSections(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const saveChanges = async () => {
    if (!sessionId || !activeVersion) return;

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Construct the full description from sections for backward compatibility
      const fullDescription = constructFullDescription(parsedSections);

      // Get next version number
      const nextVersion = (versions[0]?.version ?? 0) + 1;

      // Helper to convert HTML to plain text
      const htmlToPlainText = (html: string) => {
        const temp = document.createElement("div");
        temp.innerHTML = html;
        return temp.textContent || temp.innerText || "";
      };

      // Insert new version with structured fields
      const { error } = await supabase.from("project_descriptions").insert({
        session_id: sessionId,
        user_id: user.id,
        version: nextVersion,
        full_description: fullDescription,
        problem_title: htmlToPlainText(parsedSections.problemTitle),
        difficulty_level: htmlToPlainText(parsedSections.difficultyLevel),
        topics: htmlToPlainText(parsedSections.topics),
        problem_description: parsedSections.problemDescription,
        input_format: parsedSections.inputFormat,
        output_format: parsedSections.outputFormat,
        constraints: parsedSections.constraints,
        sample_input: htmlToPlainText(parsedSections.sampleInput),
        sample_output: htmlToPlainText(parsedSections.sampleOutput),
        explanation: parsedSections.explanation,
        edge_cases: parsedSections.edgeCases,
        additional_notes: parsedSections.additionalNotes,
      });

      if (error) throw error;

      toast({ title: "Saved!", description: "New version created successfully." });
      setIsEditing(false);
      fetchDescription(); // Refresh versions
    } catch (error) {
      console.error("Error saving:", error);
      toast({
        title: "Error",
        description: "Failed to save changes.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const constructFullDescription = (sections: ParsedDescription): string => {
    // Convert HTML back to plain text for storage
    const htmlToPlainText = (html: string) => {
      const temp = document.createElement("div");
      temp.innerHTML = html;
      return temp.textContent || temp.innerText || "";
    };

    return `Problem Title
${htmlToPlainText(sections.problemTitle)}

Difficulty Level
${htmlToPlainText(sections.difficultyLevel)}

Topic(s)
${htmlToPlainText(sections.topics)}

Problem Description
${htmlToPlainText(sections.problemDescription)}

Input Format
${htmlToPlainText(sections.inputFormat)}

Output Format
${htmlToPlainText(sections.outputFormat)}

Constraints
${htmlToPlainText(sections.constraints)}

Sample Input
${htmlToPlainText(sections.sampleInput)}

Sample Output
${htmlToPlainText(sections.sampleOutput)}

Explanation
${htmlToPlainText(sections.explanation)}

Edge Cases to Consider
${htmlToPlainText(sections.edgeCases)}

Additional Notes
${htmlToPlainText(sections.additionalNotes)}`;
  };

  const copyToClipboard = async () => {
    try {
      const fullText = constructFullDescription(parsedSections);
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      toast({ title: "Copied!", description: "Description copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({ title: "Error", description: "Failed to copy to clipboard.", variant: "destructive" });
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
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
            <Button onClick={() => navigate(`/configure-testcases/${sessionId}`)} className="gradient-primary shadow-elegant">
              <TestTube className="w-4 h-4 mr-2" />
              Configure Testcases
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Version Selector & Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Version:</label>
            <Select value={activeVersion?.id} onValueChange={handleVersionChange}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    Version {v.version} — {new Date(v.created_at).toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={copyToClipboard}>
            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? "Copied" : "Copy All"}
          </Button>
        </div>

        <Tabs defaultValue="description" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="description">Problem Description</TabsTrigger>
            <TabsTrigger value="solution" className="gap-2">
              <Code2 className="w-4 h-4" />
              Solution & Testing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="description">
            {/* Main Problem Statement Section */}
            <Card className="shadow-card border-border/50 mb-6">
              <CardHeader
                className="cursor-pointer flex flex-row items-center justify-between"
                onClick={() => toggleSection("main")}
              >
                <CardTitle className="flex items-center gap-2">
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-sm font-medium">Q1.</span>
                  Problem Statement
                </CardTitle>
                {expandedSections.main ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </CardHeader>
              {expandedSections.main && (
                <CardContent className="space-y-4">
                  {/* Problem Title */}
                  <div className="mb-4">
                    <label className="block text-sm font-bold text-foreground uppercase tracking-wide mb-2">
                      Problem Title:
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={parsedSections.problemTitle}
                        onChange={(e) => updateSection("problemTitle", e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    ) : (
                      <div className="px-3 py-2 bg-muted/30 rounded-lg font-medium">
                        {parsedSections.problemTitle || "No title"}
                      </div>
                    )}
                  </div>

                  {/* Topics */}
                  <div className="mb-4">
                    <label className="block text-sm font-bold text-foreground uppercase tracking-wide mb-2">
                      Topic(s):
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={parsedSections.topics}
                        onChange={(e) => updateSection("topics", e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="e.g., Arrays, Dynamic Programming"
                      />
                    ) : (
                      <div className="px-3 py-2 bg-muted/30 rounded-lg">
                        {parsedSections.topics || "No topics"}
                      </div>
                    )}
                  </div>

                  {/* Problem Description */}
                  <EditableSection
                    label="Problem Description"
                    value={parsedSections.problemDescription}
                    onChange={(val) => updateSection("problemDescription", val)}
                    isEditing={isEditing}
                    minHeight="200px"
                  />

                  {/* Constraints */}
                  <EditableSection
                    label="Constraints"
                    value={parsedSections.constraints}
                    onChange={(val) => updateSection("constraints", val)}
                    isEditing={isEditing}
                    minHeight="100px"
                  />
                </CardContent>
              )}
            </Card>

            {/* Input/Output Format Section */}
            <Card className="shadow-card border-border/50 mb-6">
              <CardHeader
                className="cursor-pointer flex flex-row items-center justify-between"
                onClick={() => toggleSection("inputOutput")}
              >
                <CardTitle>Input & Output Format</CardTitle>
                {expandedSections.inputOutput ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </CardHeader>
              {expandedSections.inputOutput && (
                <CardContent className="grid md:grid-cols-2 gap-6">
                  <EditableSection
                    label="Input Format"
                    value={parsedSections.inputFormat}
                    onChange={(val) => updateSection("inputFormat", val)}
                    isEditing={isEditing}
                    minHeight="150px"
                  />
                  <EditableSection
                    label="Output Format"
                    value={parsedSections.outputFormat}
                    onChange={(val) => updateSection("outputFormat", val)}
                    isEditing={isEditing}
                    minHeight="150px"
                  />
                </CardContent>
              )}
            </Card>

            {/* Sample I/O & Explanation */}
            <Card className="shadow-card border-border/50 mb-6">
              <CardHeader
                className="cursor-pointer flex flex-row items-center justify-between"
                onClick={() => toggleSection("samples")}
              >
                <CardTitle>Sample Test Cases</CardTitle>
                {expandedSections.samples ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </CardHeader>
              {expandedSections.samples && (
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-bold text-foreground uppercase tracking-wide mb-2">
                        Sample Input:
                      </label>
                      <div className={cn(
                        "border rounded-lg p-4 font-mono text-sm bg-[#1e1e1e] text-green-400 min-h-[100px]",
                        isEditing && "cursor-text"
                      )}>
                        {isEditing ? (
                          <textarea
                            value={parsedSections.sampleInput}
                            onChange={(e) => updateSection("sampleInput", e.target.value)}
                            className="w-full bg-transparent outline-none resize-none min-h-[80px] text-green-400"
                          />
                        ) : (
                          <pre className="whitespace-pre-wrap">{parsedSections.sampleInput}</pre>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-foreground uppercase tracking-wide mb-2">
                        Sample Output:
                      </label>
                      <div className={cn(
                        "border rounded-lg p-4 font-mono text-sm bg-[#1e1e1e] text-green-400 min-h-[100px]",
                        isEditing && "cursor-text"
                      )}>
                        {isEditing ? (
                          <textarea
                            value={parsedSections.sampleOutput}
                            onChange={(e) => updateSection("sampleOutput", e.target.value)}
                            className="w-full bg-transparent outline-none resize-none min-h-[80px] text-green-400"
                          />
                        ) : (
                          <pre className="whitespace-pre-wrap">{parsedSections.sampleOutput}</pre>
                        )}
                      </div>
                    </div>
                  </div>
                  <EditableSection
                    label="Explanation"
                    value={parsedSections.explanation}
                    onChange={(val) => updateSection("explanation", val)}
                    isEditing={isEditing}
                    minHeight="120px"
                  />
                </CardContent>
              )}
            </Card>

            {/* Difficulty & Additional */}
            <Card className="shadow-card border-border/50 mb-6">
              <CardHeader
                className="cursor-pointer flex flex-row items-center justify-between"
                onClick={() => toggleSection("additional")}
              >
                <CardTitle>Additional Details</CardTitle>
                {expandedSections.additional ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </CardHeader>
              {expandedSections.additional && (
                <CardContent>
                  {/* Difficulty Dropdown */}
                  <div className="mb-6">
                    <label className="block text-sm font-bold text-foreground uppercase tracking-wide mb-2">
                      Difficulty:
                    </label>
                    {isEditing ? (
                      <Select
                        value={parsedSections.difficultyLevel}
                        onValueChange={(val) => updateSection("difficultyLevel", val)}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                          {DIFFICULTY_OPTIONS.map((level) => (
                            <SelectItem key={level} value={level}>
                              {level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className={cn(
                        "inline-block px-3 py-1.5 rounded-full text-sm font-medium",
                        parsedSections.difficultyLevel === "Easy" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                        parsedSections.difficultyLevel === "Medium" && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                        parsedSections.difficultyLevel === "Hard" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                        parsedSections.difficultyLevel === "Expert" && "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
                        !["Easy", "Medium", "Hard", "Expert"].includes(parsedSections.difficultyLevel) && "bg-muted text-muted-foreground"
                      )}>
                        {parsedSections.difficultyLevel || "Not specified"}
                      </div>
                    )}
                  </div>

                  {/* Edge Cases */}
                  <EditableSection
                    label="Edge Cases to Consider"
                    value={parsedSections.edgeCases}
                    onChange={(val) => updateSection("edgeCases", val)}
                    isEditing={isEditing}
                    minHeight="120px"
                  />

                  {/* Additional Notes */}
                  <EditableSection
                    label="Additional Notes"
                    value={parsedSections.additionalNotes}
                    onChange={(val) => updateSection("additionalNotes", val)}
                    isEditing={isEditing}
                    minHeight="100px"
                  />
                </CardContent>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="solution">
            <SolutionEditor
              sessionId={sessionId!}
              problemDescription={{
                problemTitle: parsedSections.problemTitle,
                problemDescription: parsedSections.problemDescription,
                inputFormat: parsedSections.inputFormat,
                outputFormat: parsedSections.outputFormat,
                constraints: parsedSections.constraints,
                sampleInput: parsedSections.sampleInput,
                sampleOutput: parsedSections.sampleOutput,
                difficulty: parsedSections.difficultyLevel,
                full_description: parsedSections.full_description,
              }}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
