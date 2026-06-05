import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Copy, RotateCcw, Loader2, CheckCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRecordTemplateUse, getListTemplatesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const QUICK_PROMPTS = [
  { label: "Shorter", prompt: "Make it shorter and more punchy, keep the key message." },
  { label: "WhatsApp DM", prompt: "Adapt for a casual WhatsApp DM — informal tone, no subject line." },
  { label: "LinkedIn", prompt: "Optimise for a LinkedIn connection message — professional, concise, under 300 chars." },
  { label: "Cold email", prompt: "Turn this into a compelling cold email with a subject line." },
  { label: "More friendly", prompt: "Make the tone warmer and more conversational." },
  { label: "Formal", prompt: "Make it more formal and business-like." },
];

interface RefineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: {
    id: number;
    title: string;
    content: string;
  };
}

export function RefineModal({ open, onOpenChange, template }: RefineModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const recordUse = useRecordTemplateUse();

  const [instruction, setInstruction] = useState("");
  const [refined, setRefined] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleRefine = async (customInstruction?: string) => {
    const inst = customInstruction ?? instruction;
    if (!inst.trim()) return;

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setRefined("");
    setIsStreaming(true);
    setCopied(false);

    try {
      const res = await fetch("/api/ai/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateContent: template.content, instruction: inst }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error("Request failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

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
            if (parsed.content) setRefined((prev) => prev + parsed.content);
          } catch {
            // skip malformed chunks
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      toast({ title: "Refinement failed", description: "Could not reach AI. Try again.", variant: "destructive" });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleCopyRefined = () => {
    if (!refined) return;
    navigator.clipboard.writeText(refined);
    setCopied(true);
    recordUse.mutate({ id: template.id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() }),
    });
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied!", description: "Refined version copied to clipboard.", duration: 2500 });
  };

  const handleReset = () => {
    if (abortRef.current) abortRef.current.abort();
    setRefined("");
    setIsStreaming(false);
    setCopied(false);
  };

  const handleClose = (val: boolean) => {
    if (!val) handleReset();
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">Refine with AI</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-md">{template.title}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 space-y-5">
          {/* Original */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Original</p>
            <div className="bg-muted/40 rounded-lg p-3 text-sm text-foreground/80 whitespace-pre-wrap max-h-36 overflow-y-auto border border-border/50 leading-relaxed">
              {template.content}
            </div>
          </div>

          {/* Quick prompts */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Quick adjust</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p.label}
                  data-testid={`quick-prompt-${p.label.toLowerCase().replace(/\s+/g, "-")}`}
                  onClick={() => {
                    setInstruction(p.prompt);
                    handleRefine(p.prompt);
                  }}
                  disabled={isStreaming}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs font-medium bg-card hover:bg-primary/5 hover:border-primary/40 hover:text-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom instruction */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Custom instruction</p>
            <div className="flex gap-2">
              <Textarea
                data-testid="input-refinement-instruction"
                placeholder='e.g. "Make it shorter for a WhatsApp DM to a startup founder"'
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleRefine();
                }}
                rows={2}
                className="resize-none text-sm"
                disabled={isStreaming}
              />
              <Button
                data-testid="button-refine-submit"
                onClick={() => handleRefine()}
                disabled={isStreaming || !instruction.trim()}
                className="shrink-0 self-end bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
              >
                {isStreaming ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                Refine
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">Tip: ⌘ + Enter to refine</p>
          </div>

          {/* Output */}
          {(refined || isStreaming) && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Refined version</p>
                {!isStreaming && (
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>
              <div className="relative">
                <div
                  data-testid="text-refined-output"
                  className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm whitespace-pre-wrap min-h-[80px] max-h-52 overflow-y-auto leading-relaxed text-foreground"
                >
                  {refined}
                  {isStreaming && (
                    <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5 align-middle" />
                  )}
                </div>

                {!isStreaming && refined && (
                  <Button
                    data-testid="button-copy-refined"
                    onClick={handleCopyRefined}
                    size="sm"
                    className={`absolute bottom-3 right-3 gap-1.5 text-xs h-7 px-3 shadow-sm transition-all ${
                      copied
                        ? "bg-green-600 hover:bg-green-600 text-white"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                  >
                    {copied ? (
                      <>
                        <CheckCheck className="w-3 h-3" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
