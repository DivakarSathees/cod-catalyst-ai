// import { useState, useEffect, useRef } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import { supabase } from "@/integrations/supabase/client";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Card } from "@/components/ui/card";
// import { ScrollArea } from "@/components/ui/scroll-area";
// import { useChat } from "@/hooks/useChat";
// import { toast } from "@/hooks/use-toast";
// import { ArrowLeft, Send, Sparkles, Bot, User, Loader2 } from "lucide-react";
// import ReactMarkdown from "react-markdown";

// export default function Chat() {
//   const { sessionId } = useParams<{ sessionId: string }>();
//   const navigate = useNavigate();
//   const [input, setInput] = useState("");
//   const [sessionTitle, setSessionTitle] = useState("New Project");
//   const scrollRef = useRef<HTMLDivElement>(null);
//   const inputRef = useRef<HTMLInputElement>(null);

//   const { messages, memory, isLoading, isStreaming, loadMessages, sendMessage, generateDescription } = useChat(sessionId);

//   useEffect(() => {
//     const checkAuth = async () => {
//       const { data: { session } } = await supabase.auth.getSession();
//       if (!session) {
//         navigate("/auth");
//         return;
//       }
//       loadMessages();
//       fetchSessionTitle();
//     };
//     checkAuth();
//   }, [sessionId, navigate, loadMessages]);

//   useEffect(() => {
//     // Auto-scroll to bottom when new messages arrive
//     if (scrollRef.current) {
//       scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
//     }
//   }, [messages]);

//   useEffect(() => {
//     // Send initial greeting if no messages
//     if (messages.length === 0 && !isLoading) {
//       sendMessage("Hello, I'd like to create a project description.");
//     }
//   }, [messages.length]);

//   const fetchSessionTitle = async () => {
//     if (!sessionId) return;
//     const { data } = await supabase
//       .from("chat_sessions")
//       .select("title")
//       .eq("id", sessionId)
//       .single();
//     if (data) setSessionTitle(data.title);
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!input.trim() || isLoading) return;
//     const message = input;
//     setInput("");
//     await sendMessage(message);
//     inputRef.current?.focus();
//   };

//   const handleGenerateDescription = async () => {
//     const description = await generateDescription();
//     if (description) {
//       toast({ title: "Success", description: "Project description generated!" });
//       navigate(`/description/${sessionId}`);
//     }
//   };

//   return (
//     <div className="min-h-screen gradient-subtle flex flex-col">
//       {/* Header */}
//       <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
//         <div className="container mx-auto px-4 py-4 flex items-center justify-between">
//           <div className="flex items-center gap-3">
//             <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
//               <ArrowLeft className="w-5 h-5" />
//             </Button>
//             <div>
//               <h1 className="font-semibold">{sessionTitle}</h1>
//               <p className="text-xs text-muted-foreground">Session: {sessionId?.slice(0, 8)}...</p>
//             </div>
//           </div>
//           {memory.ready_to_generate && (
//             <Button onClick={handleGenerateDescription} disabled={isLoading} className="gradient-primary shadow-elegant">
//               <Sparkles className="w-4 h-4 mr-2" />
//               Generate Description
//             </Button>
//           )}
//         </div>
//       </header>

//       {/* Chat Messages */}
//       <ScrollArea className="flex-1 p-4" ref={scrollRef}>
//         <div className="container mx-auto max-w-3xl space-y-4 pb-4">
//           {messages.map((message, index) => (
//             <div
//               key={index}
//               className={`flex gap-3 animate-message-in ${
//                 message.role === "user" ? "justify-end" : "justify-start"
//               }`}
//               style={{ animationDelay: `${index * 50}ms` }}
//             >
//               {message.role === "assistant" && (
//                 <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
//                   <Bot className="w-4 h-4 text-primary" />
//                 </div>
//               )}
//               <Card
//                 className={`max-w-[80%] p-4 ${
//                   message.role === "user"
//                     ? "bg-primary text-primary-foreground"
//                     : "bg-card border-border/50"
//                 }`}
//               >
//                 {message.role === "assistant" ? (
//                   <div className="prose prose-sm dark:prose-invert max-w-none">
//                     <ReactMarkdown>{message.content || "..."}</ReactMarkdown>
//                   </div>
//                 ) : (
//                   <p className="text-sm">{message.content}</p>
//                 )}
//               </Card>
//               {message.role === "user" && (
//                 <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
//                   <User className="w-4 h-4 text-secondary-foreground" />
//                 </div>
//               )}
//             </div>
//           ))}
          
//           {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
//             <div className="flex gap-3 justify-start animate-message-in">
//               <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
//                 <Bot className="w-4 h-4 text-primary" />
//               </div>
//               <Card className="p-4 bg-card border-border/50">
//                 <div className="flex gap-1">
//                   <div className="w-2 h-2 rounded-full bg-muted-foreground typing-dot" />
//                   <div className="w-2 h-2 rounded-full bg-muted-foreground typing-dot" />
//                   <div className="w-2 h-2 rounded-full bg-muted-foreground typing-dot" />
//                 </div>
//               </Card>
//             </div>
//           )}
//         </div>
//       </ScrollArea>

//       {/* Input */}
//       <div className="border-t border-border/50 bg-card/80 backdrop-blur-sm p-4">
//         <form onSubmit={handleSubmit} className="container mx-auto max-w-3xl">
//           <div className="flex gap-2">
//             <Input
//               ref={inputRef}
//               value={input}
//               onChange={(e) => setInput(e.target.value)}
//               placeholder="Type your message..."
//               disabled={isLoading}
//               className="flex-1"
//             />
//             <Button type="submit" disabled={isLoading || !input.trim()} className="gradient-primary">
//               {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
//             </Button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// }



import React, { useState, useEffect, useRef } from "react";
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
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // useChat should provide: messages[], memory, isLoading, isStreaming, loadMessages(), sendMessage(text), generateDescription()
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    // Send initial greeting if there are no messages yet
    if (messages.length === 0 && !isLoading) {
      // 'start' is a neutral kick-off message the server understands
      sendMessage("start");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, isLoading]);

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
    const message = input.trim();
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

  // Helper: try to parse assistant message content that may be JSON (structure produced by the server)
  function normalizeMessage(message: any) {
    // if message already has explicit fields, return as-is
    if (message.type) return message;

    // attempt to parse message.content if it's a JSON object string
    const content = message.content ?? message.text ?? "";
    if (typeof content === "string") {
      const trimmed = content.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          const parsed = JSON.parse(trimmed);
          // Expected parsed shape: { type: 'question'|'text', question?: string, options?: string[], content?: string }
          if (parsed && typeof parsed === "object") {
            return {
              ...message,
              type: parsed.type || "text",
              question: parsed.question || parsed.prompt || parsed.content || null,
              options: parsed.options || parsed.choices || null,
              content: parsed.content || (parsed.type === "text" ? parsed.text || message.content : message.content),
            };
          }
        } catch (err) {
          // not JSON — fall through to treat as simple text
        }
      }
    }

    // default fallback
    return { ...message, type: "text", content };
  }

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
          {memory?.ready_to_generate && (
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
          {messages.map((rawMessage: any, index: number) => {
            const message = normalizeMessage(rawMessage);
            const isUser = message.role === "user";
            const isAssistant = message.role === "assistant" || message.role === "system";

            return (
              <div
                key={index}
                className={`flex gap-3 animate-message-in ${isUser ? "justify-end" : "justify-start"}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {isAssistant && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}

                <Card
                  className={`max-w-[80%] p-4 ${isUser ? "bg-primary text-primary-foreground" : "bg-card border-border/50"}`}
                >
                  {/* If the assistant asked a question with options */}
                  {message.type === "question" ? (
                    <div>
                      <p className="font-medium mb-2">{message.question}</p>

                      {message.options && message.options.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {message.options.map((opt: string, idx: number) => (
                            <Button
                              key={idx}
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                // send the selected option text to the chat backend
                                await sendMessage(opt);
                              }}
                            >
                              {opt}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        // if no options provided, still show a quick-reply "Confirm" button and allow manual typing
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => await sendMessage("Yes")}
                          >
                            Yes
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => await sendMessage("No")}
                          >
                            No
                          </Button>
                        </div>
                      )}

                      {/* Also show any explanatory content if present */}
                      {message.content && (
                        <div className="prose prose-sm dark:prose-invert max-w-none mt-3">
                          {/* <ReactMarkdown>{message.content}</ReactMarkdown> */}
                        </div>
                      )}
                    </div>
                  ) : (
                    // Normal assistant or user text
                    isAssistant ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{message.content || "..."}</ReactMarkdown>
                      </div>
                    ) 
                    : (
                      <p className="text-sm">{message.content}</p>
                    )
                  )}
                </Card>

                {isUser && (
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-secondary-foreground" />
                  </div>
                )}
              </div>
            );
          })}

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



