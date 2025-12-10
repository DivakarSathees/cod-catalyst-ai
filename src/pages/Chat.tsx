import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChat } from "@/hooks/useChat";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Send, Sparkles, Bot, User, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function Chat() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [sessionTitle, setSessionTitle] = useState("New Project");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { messages, memory, isLoading, isStreaming, loadMessages, sendMessage, generateDescription } = useChat(sessionId);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      loadMessages();
      fetchSessionTitle();
    };
    checkAuth();
  }, [sessionId, navigate, loadMessages]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    // Send initial greeting if no messages
    if (messages.length === 0 && !isLoading) {
      sendMessage("Hello, I'd like to create a project description.");
    }
  }, [messages.length]);

  const fetchSessionTitle = async () => {
    if (!sessionId) return;
    const { data } = await supabase
      .from("chat_sessions")
      .select("title")
      .eq("id", sessionId)
      .single();
    if (data) setSessionTitle(data.title);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const message = input;
    setInput("");
    await sendMessage(message);
    inputRef.current?.focus();
  };

  const handleGenerateDescription = async () => {
    const description = await generateDescription();
    if (description) {
      toast({ title: "Success", description: "Project description generated!" });
      navigate(`/description/${sessionId}`);
    }
  };

  return (
    <div className="min-h-screen gradient-subtle flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-semibold">{sessionTitle}</h1>
              <p className="text-xs text-muted-foreground">Session: {sessionId?.slice(0, 8)}...</p>
            </div>
          </div>
          {memory.ready_to_generate && (
            <Button onClick={handleGenerateDescription} disabled={isLoading} className="gradient-primary shadow-elegant">
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Description
            </Button>
          )}
        </div>
      </header>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="container mx-auto max-w-3xl space-y-4 pb-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 animate-message-in ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              <Card
                className={`max-w-[80%] p-4 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border-border/50"
                }`}
              >
                {message.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{message.content || "..."}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm">{message.content}</p>
                )}
              </Card>
              {message.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-secondary-foreground" />
                </div>
              )}
            </div>
          ))}
          
          {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-3 justify-start animate-message-in">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <Card className="p-4 bg-card border-border/50">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground typing-dot" />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground typing-dot" />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground typing-dot" />
                </div>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border/50 bg-card/80 backdrop-blur-sm p-4">
        <form onSubmit={handleSubmit} className="container mx-auto max-w-3xl">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !input.trim()} className="gradient-primary">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
