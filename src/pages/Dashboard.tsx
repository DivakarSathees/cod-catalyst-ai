import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Plus, FileCode2, LogOut, Clock, ChevronRight, Trash2 } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { format } from "date-fns";

interface ChatSession {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchSessions();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchSessions = async () => {
    try {
      // fetch sessions and include project description (one-to-one)
      const { data, error } = await supabase
        .from("chat_sessions")
        .select("*, project_descriptions(full_description)")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      // Normalize titles: if title is the default "New Project", try to extract a title from
      // the stored project description HTML (full_description) when available.
      const normalizeTitle = (session: any) => {
        let title = session.title || "New Project";
        if (!title || title === "New Project") {
          const full = session.project_descriptions?.full_description || session.full_description || "";
          if (full) {
            // try to extract from <title> or first <h1>
            try {
              const doc = new DOMParser().parseFromString(full, "text/html");
              const t = doc.querySelector("title")?.textContent?.trim();
              if (t) return t;
              const h1 = doc.querySelector("h1")?.textContent?.trim();
              if (h1) return h1;
              // fallback: first non-empty text node
              const bodyText = doc.body.textContent?.trim();
              if (bodyText) return bodyText.split("\n").map(s=>s.trim()).find(Boolean) || "New Project";
            } catch (e) {
              // fallback to crude regex
              const m = full.match(/<title>(.*?)<\/title>/i);
              if (m && m[1]) return m[1].trim();
            }
          }
        }
        return title;
      };

      setSessions((data || []).map((s: any) => ({
        id: s.id,
        title: normalizeTitle(s),
        status: s.status,
        created_at: s.created_at,
        updated_at: s.updated_at,
      })));
    } catch (error) {
      console.error("Error fetching sessions:", error);
      toast({ title: "Error", description: "Failed to load your projects.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const createNewSession = async () => {
    try {
      const { data, error } = await supabase
        .from("chat_sessions")
        .insert({ user_id: user!.id, title: "New Project" })
        .select()
        .single();

      if (error) throw error;

      // Create memory for this session
      await supabase.from("chat_memory").insert({
        session_id: data.id,
        user_id: user!.id,
      });

      navigate(`/chat/${data.id}`);
    } catch (error) {
      console.error("Error creating session:", error);
      toast({ title: "Error", description: "Failed to create new project.", variant: "destructive" });
    }
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from("chat_sessions")
        .delete()
        .eq("id", sessionId);

      if (error) throw error;
      setSessions(sessions.filter((s) => s.id !== sessionId));
      toast({ title: "Deleted", description: "Project has been removed." });
    } catch (error) {
      console.error("Error deleting session:", error);
      toast({ title: "Error", description: "Failed to delete project.", variant: "destructive" });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      gathering: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
      description_ready: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      testcases_configured: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    };
    const statusLabels: Record<string, string> = {
      gathering: "Gathering Info",
      description_ready: "Description Ready",
      testcases_configured: "Configuring Tests",
      completed: "Completed",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status] || statusStyles.gathering}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  const navigateToSession = (session: ChatSession) => {
    switch (session.status) {
      case "gathering":
        navigate(`/chat/${session.id}`);
        break;
      case "description_ready":
        navigate(`/description/${session.id}`);
        break;
      case "testcases_configured":
        navigate(`/testcases/${session.id}`);
        break;
      case "completed":
        navigate(`/testcases/${session.id}`);
        break;
      default:
        navigate(`/chat/${session.id}`);
    }
  };

  return (
    <div className="min-h-screen gradient-subtle">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <FileCode2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold">AI Project Builder</h1>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">Your Projects</h2>
            <p className="text-muted-foreground">Create and manage AI-generated project descriptions</p>
          </div>
          <Button onClick={createNewSession} className="gradient-primary shadow-elegant">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2 mt-2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer" onClick={createNewSession}>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-4">
                <Plus className="w-8 h-8 text-accent-foreground" />
              </div>
              <h3 className="font-semibold text-lg">Create Your First Project</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Start a conversation with AI to generate project descriptions and test cases
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((session) => (
              <Card
                key={session.id}
                className="group hover:shadow-card transition-all cursor-pointer border-border/50 hover:border-primary/30"
                onClick={() => navigateToSession(session)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg truncate pr-2">{session.title}</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity -mr-2 -mt-1"
                      onClick={(e) => deleteSession(session.id, e)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  {getStatusBadge(session.status)}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(session.updated_at), "MMM d, yyyy")}
                    </div>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
