import React from "react";
import { useGetStats, getGetStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Tags, CheckCircle, BarChart3, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetStats({ query: { queryKey: getGetStatsQueryKey() } });

  if (isLoading || !stats) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-lg">Real work. Real value. Real people.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Templates" value={stats.totalTemplates} icon={FileText} />
        <StatCard title="Total Categories" value={stats.totalCategories} icon={Tags} />
        <StatCard title="Total Uses" value={stats.totalUses} icon={CheckCircle} />
        <StatCard title="Favorited" value={stats.favoritedCount} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Channel Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.channelBreakdown.map((cb) => (
                <div key={cb.channel} className="flex items-center justify-between">
                  <span className="font-medium text-sm text-foreground">{cb.channel}</span>
                  <span className="text-muted-foreground text-sm font-semibold bg-secondary px-2 py-0.5 rounded-full">{cb.count}</span>
                </div>
              ))}
              {stats.channelBreakdown.length === 0 && <p className="text-muted-foreground text-sm">No data available.</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tags className="w-5 h-5 text-primary" />
              Category Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.categoryBreakdown.map((cb) => (
                <div key={cb.categoryId} className="flex items-center justify-between">
                  <span className="font-medium text-sm text-foreground">{cb.categoryName}</span>
                  <span className="text-muted-foreground text-sm font-semibold bg-secondary px-2 py-0.5 rounded-full">{cb.count}</span>
                </div>
              ))}
              {stats.categoryBreakdown.length === 0 && <p className="text-muted-foreground text-sm">No data available.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon }: { title: string; value: number; icon: React.ElementType }) {
  return (
    <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6 flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
        </div>
        <div className="p-4 bg-primary/10 rounded-full">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}
