import { useState, useRef, useEffect } from "react";
import {
  useListKnowledgeDocs,
  getListKnowledgeDocsQueryKey,
  useCreateKnowledgeDoc,
  useUpdateKnowledgeDoc,
  useDeleteKnowledgeDoc,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Bot, BookOpen, Plus, Pencil, Trash2, Send, Loader2,
  User, Sparkles, FileText, RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

const KNOWLEDGE_CATEGORIES = [
  "General", "Brand & Tone", "Product", "Process", "FAQs", "Pricing", "Updates",
];

type ChatMessage = { role: "user" | "assistant"; content: string };

// ─── Tab: AI Chat ────────────────────────────────────────────────────────────

function ChatTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    const assistantMsg: ChatMessage = { role: "assistant", content: "" };
    setMessages([...newMessages, assistantMsg]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error("Request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json) continue;
          try {
            const parsed = JSON.parse(json);
            if (parsed.done) break;
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.content) {
              accumulated += parsed.content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: accumulated };
                return updated;
              });
            }
          } catch {
            // skip
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      toast({ title: "Chat failed", description: "Could not reach AI.", variant: "destructive" });
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[400px]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Bot className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-semibold text-lg text-foreground mb-2">Ask anything about Duollance</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              I know your brand, product, process, and tone — and I stay up to date as your team adds new knowledge docs.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {[
                "What makes Duollance different from Upwork?",
                "How does the AI smart-match process work?",
                "What's our brand voice for LinkedIn outreach?",
                "How do we respond to pricing questions?",
              ].map((q) => (
                <button
                  key={q}
                  data-testid={`suggestion-${q.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`}
                  onClick={() => { setInput(q); }}
                  className="text-left text-xs px-3 py-2.5 rounded-lg border border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-all text-muted-foreground hover:text-foreground"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            data-testid={`message-${msg.role}-${i}`}
            className={cn(
              "flex gap-3",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-card border border-border text-foreground rounded-tl-sm"
              )}
            >
              {msg.content}
              {isStreaming && i === messages.length - 1 && msg.role === "assistant" && !msg.content && (
                <span className="inline-flex gap-1 items-center py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                </span>
              )}
              {isStreaming && i === messages.length - 1 && msg.role === "assistant" && msg.content && (
                <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5 align-middle" />
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border pt-4">
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            New conversation
          </button>
        )}
        <div className="flex gap-2">
          <Textarea
            data-testid="input-chat-message"
            placeholder="Ask anything about Duollance... (Enter to send, Shift+Enter for newline)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            className="resize-none text-sm flex-1"
            disabled={isStreaming}
          />
          <Button
            data-testid="button-chat-send"
            onClick={send}
            disabled={isStreaming || !input.trim()}
            className="self-end bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
          >
            {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Knowledge Doc Form ───────────────────────────────────────────────────────

const docSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  category: z.string().min(1, "Category is required"),
});
type DocFormValues = z.infer<typeof docSchema>;

function DocFormDialog({
  open,
  onOpenChange,
  existing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existing?: { id: number; title: string; content: string; category: string } | null;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createDoc = useCreateKnowledgeDoc();
  const updateDoc = useUpdateKnowledgeDoc();

  const form = useForm<DocFormValues>({
    resolver: zodResolver(docSchema),
    defaultValues: {
      title: existing?.title ?? "",
      content: existing?.content ?? "",
      category: existing?.category ?? "General",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: existing?.title ?? "",
        content: existing?.content ?? "",
        category: existing?.category ?? "General",
      });
    }
  }, [open, existing]);

  const onSubmit = (values: DocFormValues) => {
    const invalidate = () =>
      queryClient.invalidateQueries({ queryKey: getListKnowledgeDocsQueryKey() });

    if (existing) {
      updateDoc.mutate(
        { id: existing.id, data: values },
        {
          onSuccess: () => {
            invalidate();
            toast({ title: "Document updated" });
            onOpenChange(false);
          },
          onError: () => toast({ title: "Failed to update", variant: "destructive" }),
        }
      );
    } else {
      createDoc.mutate(
        { data: values },
        {
          onSuccess: () => {
            invalidate();
            toast({ title: "Document added to knowledge base" });
            onOpenChange(false);
          },
          onError: () => toast({ title: "Failed to create", variant: "destructive" }),
        }
      );
    }
  };

  const isPending = createDoc.isPending || updateDoc.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit document" : "Add knowledge document"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="col-span-2 sm:col-span-1">
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input data-testid="input-doc-title" placeholder="e.g. What is Duollance" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem className="col-span-2 sm:col-span-1">
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-doc-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {KNOWLEDGE_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea
                      data-testid="textarea-doc-content"
                      placeholder="Paste or type the document content here..."
                      rows={12}
                      className="resize-y text-sm font-mono"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                data-testid="button-save-doc"
                type="submit"
                disabled={isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {existing ? "Save changes" : "Add document"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tab: Knowledge Docs ──────────────────────────────────────────────────────

function DocsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: docs, isLoading } = useListKnowledgeDocs({
    query: { queryKey: getListKnowledgeDocsQueryKey() },
  });
  const deleteDoc = useDeleteKnowledgeDoc();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<typeof docs extends Array<infer T> ? T : never | null>(null as any);

  const grouped = (docs ?? []).reduce<Record<string, typeof docs>>((acc, doc) => {
    const cat = doc.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(doc);
    return acc;
  }, {});

  const handleDelete = (id: number, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    deleteDoc.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListKnowledgeDocsQueryKey() });
          toast({ title: "Document removed" });
        },
        onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {docs?.length ?? 0} document{docs?.length !== 1 ? "s" : ""} in the knowledge base. The AI reads all of these when answering questions and refining templates.
          </p>
        </div>
        <Button
          data-testid="button-add-doc"
          onClick={() => { setEditing(null); setFormOpen(true); }}
          className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add document
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : docs?.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-dashed border-border">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="font-medium text-foreground mb-1">No knowledge documents yet</h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
            Add documents about Duollance — brand guidelines, product overviews, FAQs, pricing — and the AI will use them to answer questions and refine templates.
          </p>
          <Button
            onClick={() => { setEditing(null); setFormOpen(true); }}
            variant="outline"
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add your first document
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).sort().map(([category, categoryDocs]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                {category}
                <span className="font-normal normal-case tracking-normal text-muted-foreground/60">
                  ({categoryDocs?.length})
                </span>
              </h3>
              <div className="space-y-2">
                {categoryDocs?.map((doc) => (
                  <Card
                    key={doc.id}
                    data-testid={`card-knowledge-${doc.id}`}
                    className="border-border hover:border-primary/20 transition-colors"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm text-foreground truncate">{doc.title}</h4>
                            <Badge variant="secondary" className="text-[10px] shrink-0">{doc.category}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {doc.content}
                          </p>
                          <p className="text-[10px] text-muted-foreground/60 mt-2">
                            Updated {new Date(doc.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            data-testid={`button-edit-doc-${doc.id}`}
                            onClick={() => { setEditing(doc as any); setFormOpen(true); }}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            data-testid={`button-delete-doc-${doc.id}`}
                            onClick={() => handleDelete(doc.id, doc.title)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <DocFormDialog
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditing(null); }}
        existing={editing}
      />
    </div>
  );
}

// ─── Knowledge Page ───────────────────────────────────────────────────────────

type Tab = "chat" | "docs";

export default function KnowledgePage() {
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const { data: docs } = useListKnowledgeDocs({
    query: { queryKey: getListKnowledgeDocsQueryKey() },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Duo AI</h1>
        <p className="text-muted-foreground mt-1">
          Ask questions, get instant answers, and keep the AI up to date with your latest docs.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {([
          { id: "chat" as Tab, label: "Ask AI", icon: Bot },
          { id: "docs" as Tab, label: `Knowledge Docs${docs && docs.length > 0 ? ` (${docs.length})` : ""}`, icon: BookOpen },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            data-testid={`tab-${id}`}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
              activeTab === id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "chat" ? <ChatTab /> : <DocsTab />}
    </div>
  );
}
