import { useState } from "react";
import { Link } from "wouter";
import { 
  useListTemplates, 
  getListTemplatesQueryKey, 
  useRecordTemplateUse,
  useToggleFavorite
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Search, Star, MessageSquare, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RefineModal } from "@/components/refine-modal";

export default function TemplatesList() {
  const [search, setSearch] = useState("");
  const { data: templates, isLoading } = useListTemplates(
    { search }, 
    { query: { queryKey: getListTemplatesQueryKey({ search }) } }
  );
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Template Library</h1>
          <p className="text-muted-foreground mt-1">Find the perfect message in seconds.</p>
        </div>
        
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            data-testid="input-search-templates"
            placeholder="Search templates..." 
            className="pl-9 bg-card border-border shadow-sm focus-visible:ring-primary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      ) : templates?.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-xl border border-border">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-foreground">No templates found</h3>
          <p className="text-muted-foreground mb-6">Create your first template to get started.</p>
          <Link href="/templates/new">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Create Template</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates?.map(template => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateCard({ template }: { template: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const recordUse = useRecordTemplateUse();
  const toggleFavorite = useToggleFavorite();
  const [refineOpen, setRefineOpen] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(template.content);
    recordUse.mutate({ id: template.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() });
        toast({
          title: "Copied to clipboard",
          description: "Usage recorded.",
          duration: 3000,
        });
      }
    });
  };

  const handleFavorite = () => {
    toggleFavorite.mutate({ id: template.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTemplatesQueryKey() });
      }
    });
  };

  return (
    <>
      <Card
        data-testid={`card-template-${template.id}`}
        className="flex flex-col h-full overflow-hidden border-border hover:border-primary/30 transition-colors shadow-sm hover:shadow-md"
      >
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start gap-2">
            <div className="space-y-2">
              <Badge variant="outline" className="bg-secondary text-secondary-foreground font-medium text-xs rounded-md">
                {template.categoryName || 'Uncategorized'}
              </Badge>
              <h3 className="font-semibold text-lg line-clamp-2 leading-tight">
                <Link href={`/templates/${template.id}`} className="hover:text-primary transition-colors">
                  {template.title}
                </Link>
              </h3>
            </div>
            <button 
              data-testid={`button-favorite-${template.id}`}
              onClick={handleFavorite}
              className="text-muted-foreground hover:text-yellow-500 transition-colors shrink-0"
            >
              <Star className={`w-5 h-5 ${template.isFavorited ? 'fill-yellow-500 text-yellow-500' : ''}`} />
            </button>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 pb-4">
          <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
            {template.content}
          </p>
          
          <div className="flex flex-wrap gap-1 mt-auto">
            {template.channels?.slice(0, 3).map((c: string) => (
              <Badge key={c} variant="secondary" className="text-[10px] px-1.5 py-0">
                {c}
              </Badge>
            ))}
            {template.channels?.length > 3 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                +{template.channels.length - 3}
              </Badge>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="pt-0 border-t border-border mt-4 flex items-center justify-between p-4 bg-card/50 gap-2">
          <span className="text-xs font-medium text-muted-foreground shrink-0">
            {template.usageCount} uses
          </span>
          <div className="flex items-center gap-2">
            <Button
              data-testid={`button-refine-${template.id}`}
              onClick={() => setRefineOpen(true)}
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs h-8 border-primary/30 text-primary hover:bg-primary/5 hover:border-primary"
            >
              <Sparkles className="w-3 h-3" />
              Refine
            </Button>
            <Button
              data-testid={`button-copy-${template.id}`}
              onClick={handleCopy}
              size="sm"
              className="gap-1.5 h-8 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </Button>
          </div>
        </CardFooter>
      </Card>

      <RefineModal
        open={refineOpen}
        onOpenChange={setRefineOpen}
        template={{ id: template.id, title: template.title, content: template.content }}
      />
    </>
  );
}
