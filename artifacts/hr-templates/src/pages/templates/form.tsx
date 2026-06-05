import React, { useEffect, useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { 
  useGetTemplate, 
  getGetTemplateQueryKey, 
  useCreateTemplate, 
  useUpdateTemplate,
  useListCategories,
  getListCategoriesQueryKey,
  useDeleteTemplate
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Trash2, Save, Sparkles, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const CHANNELS = ["Email", "LinkedIn", "WhatsApp", "Twitter/X DM", "Instagram DM", "SMS"];

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  categoryId: z.coerce.number().min(1, "Category is required"),
  channels: z.array(z.string()).min(1, "Select at least one channel"),
});

type Suggestion = { categoryId: number; categoryName: string } | null;

export default function TemplateFormPage() {
  const [, params] = useRoute("/templates/:id");
  const [, setLocation] = useLocation();
  const isNew = !params?.id || params.id === "new";
  const templateId = isNew ? 0 : Number(params.id);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [suggestion, setSuggestion] = useState<Suggestion>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const { data: template, isLoading: isTemplateLoading } = useGetTemplate(templateId, {
    query: { queryKey: getGetTemplateQueryKey(templateId), enabled: !isNew }
  });
  
  const { data: categories, isLoading: isCategoriesLoading } = useListCategories({
    query: { queryKey: getListCategoriesQueryKey() }
  });

  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();
  const deleteMutation = useDeleteTemplate();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      categoryId: 0,
      channels: [],
    },
  });

  const titleValue = useWatch({ control: form.control, name: "title" });
  const categoryIdValue = useWatch({ control: form.control, name: "categoryId" });

  useEffect(() => {
    if (template && !isNew) {
      form.reset({
        title: template.title,
        content: template.content,
        categoryId: template.categoryId,
        channels: template.channels || [],
      });
    }
  }, [template, isNew, form]);

  useEffect(() => {
    if (!isNew) return;
    if (!titleValue || titleValue.trim().length < 4 || !categories || categories.length === 0) {
      setSuggestion(null);
      return;
    }
    if (categoryIdValue && categoryIdValue > 0) {
      setSuggestion(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsSuggesting(true);
      try {
        const res = await fetch("/api/ai/suggest-category", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: titleValue.trim(),
            categories: categories.map((c) => ({ id: c.id, name: c.name })),
          }),
        });
        if (res.ok) {
          const data = await res.json() as { categoryId: number; categoryName: string };
          setSuggestion(data);
        } else {
          setSuggestion(null);
        }
      } catch {
        setSuggestion(null);
      } finally {
        setIsSuggesting(false);
      }
    }, 700);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [titleValue, categories, categoryIdValue, isNew]);

  const applySuggestion = () => {
    if (!suggestion) return;
    form.setValue("categoryId", suggestion.categoryId, { shouldValidate: true });
    setSuggestion(null);
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (isNew) {
      createMutation.mutate({ data: values }, {
        onSuccess: () => {
          toast({ title: "Template created" });
          queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
          setLocation("/templates");
        }
      });
    } else {
      updateMutation.mutate({ id: templateId, data: values }, {
        onSuccess: () => {
          toast({ title: "Template updated" });
          queryClient.invalidateQueries({ queryKey: getGetTemplateQueryKey(templateId) });
          setLocation("/templates");
        }
      });
    }
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this template?")) {
      deleteMutation.mutate({ id: templateId }, {
        onSuccess: () => {
          toast({ title: "Template deleted" });
          setLocation("/templates");
        }
      });
    }
  };

  if ((!isNew && isTemplateLoading) || isCategoriesLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/templates")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {isNew ? "Create Template" : "Edit Template"}
          </h1>
        </div>
      </div>

      <Card className="border-border shadow-sm">
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Initial Outreach - Engineers" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select 
                        onValueChange={(v) => {
                          field.onChange(Number(v));
                          setSuggestion(null);
                        }} 
                        value={field.value ? String(field.value) : undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {isNew && (isSuggesting || suggestion) && (
                        <div className="flex items-center gap-2 mt-2">
                          {isSuggesting ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Suggesting category…
                            </span>
                          ) : suggestion ? (
                            <button
                              type="button"
                              onClick={applySuggestion}
                              className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/8 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15 focus:outline-none focus:ring-2 focus:ring-primary/40"
                            >
                              <Sparkles className="w-3 h-3" />
                              Suggested: {suggestion.categoryName}
                            </button>
                          ) : null}
                        </div>
                      )}

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="channels"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel>Channels</FormLabel>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      {CHANNELS.map((channel) => (
                        <FormField
                          key={channel}
                          control={form.control}
                          name="channels"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={channel}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(channel)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, channel])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== channel
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">
                                  {channel}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <p className="text-xs text-muted-foreground mb-2">Use {'{variable}'} for placeholders like {'{client_name}'}</p>
                    <FormControl>
                      <Textarea 
                        placeholder="Hi {first_name}, I saw your profile..." 
                        className="min-h-[250px] font-mono text-sm"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-between pt-4">
                {!isNew ? (
                  <Button type="button" variant="destructive" onClick={handleDelete}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                ) : <div></div>}
                
                <div className="flex gap-4">
                  <Button type="button" variant="outline" onClick={() => setLocation("/templates")}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <Save className="w-4 h-4 mr-2" />
                    Save Template
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
