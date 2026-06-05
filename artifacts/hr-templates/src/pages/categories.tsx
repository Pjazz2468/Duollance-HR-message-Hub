import React, { useState } from "react";
import { 
  useListCategories, 
  getListCategoriesQueryKey,
  useCreateCategory,
  useDeleteCategory
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function CategoriesList() {
  const { data: categories, isLoading } = useListCategories({
    query: { queryKey: getListCategoriesQueryKey() }
  });
  
  const [name, setName] = useState("");
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    createCategory.mutate({ data: { name, color: "#2B2EFF", description: "" } }, {
      onSuccess: () => {
        setName("");
        queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
        toast({ title: "Category created" });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete category?")) {
      deleteCategory.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
          toast({ title: "Category deleted" });
        }
      });
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Categories</h1>
        <p className="text-muted-foreground mt-1">Manage template categories to keep things organized.</p>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="bg-card/50 border-b border-border pb-4">
          <CardTitle className="text-lg font-medium">Add Category</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleCreate} className="flex gap-4">
            <Input 
              placeholder="e.g. Follow up" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="max-w-sm"
            />
            <Button type="submit" disabled={createCategory.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          categories?.map(category => (
            <Card key={category.id} className="border-border shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Tag className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{category.name}</h3>
                    <p className="text-sm text-muted-foreground">{category.templateCount || 0} templates</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(category.id)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
