import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
}

export interface ChatMemory {
  questions_asked: string[];
  user_answers: Record<string, string>;
  ready_to_generate: boolean;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export function useChat(sessionId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [memory, setMemory] = useState<ChatMemory>({
    questions_asked: [],
    user_answers: {},
    ready_to_generate: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const loadMessages = useCallback(async () => {
    if (!sessionId) return;

    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;

      const { data: memoryData, error: memoryError } = await supabase
        .from("chat_memory")
        .select("*")
        .eq("session_id", sessionId)
        .single();

      if (memoryError && memoryError.code !== "PGRST116") throw memoryError;

      if (messagesData) {
        setMessages(
          messagesData.map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
          }))
        );
      }

      if (memoryData) {
        setMemory({
          questions_asked: memoryData.questions_asked || [],
          user_answers: (memoryData.user_answers as Record<string, string>) || {},
          ready_to_generate: memoryData.ready_to_generate || false,
        });
      }
    } catch (error) {
      console.error("Error loading messages:", error);
      toast({ title: "Error", description: "Failed to load chat history.", variant: "destructive" });
    }
  }, [sessionId]);

  const sendMessage = useCallback(
    async (content: string, action?: string) => {
      if (!sessionId || !content.trim()) return;

      const userMsg: ChatMessage = { role: "user", content: content.trim() };

      // Add user message to UI immediately
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setIsStreaming(true);

      try {
        // Get user for saving
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        // Save user message to database
        await supabase.from("chat_messages").insert({
          session_id: sessionId,
          user_id: user.id,
          role: "user",
          content: content.trim(),
        });

        // Prepare messages for API
        const apiMessages = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        // Stream response
        const response = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: apiMessages, memory, action }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to get response");
        }

        // Process stream
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantContent = "";
        let textBuffer = "";

        // Add empty assistant message
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;

          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;

            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                assistantContent += delta;
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  if (lastMessage?.role === "assistant") {
                    newMessages[newMessages.length - 1] = {
                      ...lastMessage,
                      content: assistantContent,
                    };
                  }
                  return newMessages;
                });
              }
            } catch {
              // Incomplete JSON, will be handled on next chunk
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }

        // Save assistant message to database
        await supabase.from("chat_messages").insert({
          session_id: sessionId,
          user_id: user.id,
          role: "assistant",
          content: assistantContent,
        });

        // Update memory - check if AI is ready to generate
        const isReady = assistantContent.toLowerCase().includes("ready to generate") ||
          assistantContent.toLowerCase().includes("shall i proceed");

        if (isReady && !memory.ready_to_generate) {
          const newMemory = { ...memory, ready_to_generate: true };
          setMemory(newMemory);
          await supabase
            .from("chat_memory")
            .update({ ready_to_generate: true })
            .eq("session_id", sessionId);
        }

      } catch (error) {
        console.error("Error sending message:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to send message",
          variant: "destructive",
        });
        // Remove the failed message
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setIsLoading(false);
        setIsStreaming(false);
      }
    },
    [sessionId, messages, memory]
  );

  const generateDescription = useCallback(async () => {
    if (!sessionId) return null;

    setIsLoading(true);
    setIsStreaming(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Prepare messages for API
      const apiMessages = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Add prompt to generate description
      apiMessages.push({
        role: "user",
        content: "Please generate the final project description based on all the information gathered.",
      });

      // Add empty assistant message
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: apiMessages, memory, action: "generate_description" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate description");
      }

      // Process stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullDescription = "";
      let textBuffer = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullDescription += delta;
              setMessages((prev) => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage?.role === "assistant") {
                  newMessages[newMessages.length - 1] = {
                    ...lastMessage,
                    content: fullDescription,
                  };
                }
                return newMessages;
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Save to database
      await supabase.from("chat_messages").insert({
        session_id: sessionId,
        user_id: user.id,
        role: "assistant",
        content: fullDescription,
      });

      console.log(fullDescription);

      // Parse the JSON response
      let parsedData: {
        problemTitle: string;
        difficultyLevel: string;
        topics: string;
        problemDescription: string;
        inputFormat: string;
        outputFormat: string;
        constraints: string;
        sampleInput: string;
        sampleOutput: string;
        explanation: string;
        edgeCases: string;
        additionalNotes: string;
      };

      try {
        // Try to extract JSON if it's wrapped in markdown code blocks
        let jsonStr = fullDescription.trim();
        if (jsonStr.startsWith("```json")) {
          jsonStr = jsonStr.replace(/^```json\s*/, "").replace(/```\s*$/, "");
        } else if (jsonStr.startsWith("```")) {
          jsonStr = jsonStr.replace(/^```\s*/, "").replace(/```\s*$/, "");
        }

        parsedData = JSON.parse(jsonStr);
      } catch (error) {
        console.error("Failed to parse JSON response:", error);
        toast({
          title: "Error",
          description: "Failed to parse generated description. Please try again.",
          variant: "destructive",
        });
        return null;
      }

      // Get next version
      const { data: last, error } = await supabase
        .from("project_descriptions")
        .select("version")
        .eq("session_id", sessionId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle<{ version: number }>();

      if (error) throw error;

      const nextVersion = (last?.version ?? 0) + 1;

      // Reconstruct full_description for backward compatibility
      const fullDescriptionText = `Problem Title
${parsedData.problemTitle}

Difficulty Level
${parsedData.difficultyLevel}

Topic(s)
${parsedData.topics}

Problem Description
${parsedData.problemDescription}

Input Format
${parsedData.inputFormat}

Output Format
${parsedData.outputFormat}

Constraints
${parsedData.constraints}

Sample Input
${parsedData.sampleInput}

Sample Output
${parsedData.sampleOutput}

Explanation
${parsedData.explanation}

Edge Cases to Consider
${parsedData.edgeCases}

Additional Notes
${parsedData.additionalNotes}`;

      // Insert new version with structured fields
      await supabase.from("project_descriptions").insert({
        session_id: sessionId,
        user_id: user.id,
        version: nextVersion,
        full_description: fullDescriptionText,
        problem_title: parsedData.problemTitle,
        difficulty_level: parsedData.difficultyLevel,
        topics: parsedData.topics,
        problem_description: parsedData.problemDescription,
        input_format: parsedData.inputFormat,
        output_format: parsedData.outputFormat,
        constraints: parsedData.constraints,
        sample_input: parsedData.sampleInput,
        sample_output: parsedData.sampleOutput,
        explanation: parsedData.explanation,
        edge_cases: parsedData.edgeCases,
        additional_notes: parsedData.additionalNotes,
      });



      // Update session status
      await supabase
        .from("chat_sessions")
        .update({ status: "description_ready" })
        .eq("id", sessionId);

      return fullDescription;
    } catch (error) {
      console.error("Error generating description:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate description",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [sessionId, messages, memory]);

  return {
    messages,
    memory,
    isLoading,
    isStreaming,
    loadMessages,
    sendMessage,
    generateDescription,
    setMessages,
  };
}
