import React from "react";
import { Link, useLocation } from "wouter";
import { FileText, Tags, Plus, Home, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import logoWhite from "@assets/Duollance_white@300x_1780686386162.png";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Templates", href: "/templates", icon: FileText },
    { name: "Categories", href: "/categories", icon: Tags },
    { name: "Duollance AI", href: "/knowledge", icon: Bot },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <div className="w-64 bg-sidebar border-r border-sidebar-border text-sidebar-foreground flex flex-col hidden md:flex">
        <div className="p-6">
          <img src={logoWhite} alt="Duollance" className="h-8 object-contain" />
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="p-4">
          <Link href="/templates/new">
            <div className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer shadow-sm">
              <Plus className="w-4 h-4" />
              New Template
            </div>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-background">
        <div className="p-8 max-w-6xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
