import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { FileText, Tags, Home, Bot, Plus, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import logoWhite from "@assets/Duollance_white@300x_1780686386162.png";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Templates", href: "/templates", icon: FileText },
    { name: "Categories", href: "/categories", icon: Tags },
    { name: "Duo AI", href: "/knowledge", icon: Bot },
  ];

  const isActive = (href: string) =>
    location === href || (href !== "/" && location.startsWith(href));

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* ── Desktop Sidebar ───────────────────────────────────────── */}
      <div className="hidden md:flex w-64 bg-sidebar border-r border-sidebar-border text-sidebar-foreground flex-col shrink-0">
        <div className="p-6">
          <img src={logoWhite} alt="Duollance" className="h-8 object-contain" />
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {navigation.map((item) => (
            <Link key={item.name} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                  isActive(item.href)
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </div>
            </Link>
          ))}
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

      {/* ── Mobile Overlay Menu ───────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Drawer */}
          <div className="absolute left-0 top-0 h-full w-64 bg-sidebar text-sidebar-foreground flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-sidebar-border">
              <img src={logoWhite} alt="Duollance" className="h-7 object-contain" />
              <button onClick={() => setMobileMenuOpen(false)} className="text-sidebar-foreground/70 hover:text-sidebar-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-4 py-4 space-y-2">
              {navigation.map((item) => (
                <Link key={item.name} href={item.href}>
                  <div
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                      isActive(item.href)
                        ? "bg-primary text-primary-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </div>
                </Link>
              ))}
            </nav>
            <div className="p-4 border-t border-sidebar-border">
              <Link href="/templates/new">
                <div
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  New Template
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Mobile Top Bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-sidebar border-b border-sidebar-border shrink-0">
          <img src={logoWhite} alt="Duollance" className="h-7 object-contain" />
          <div className="flex items-center gap-2">
            <Link href="/templates/new">
              <div className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-xs font-medium">
                <Plus className="w-3.5 h-3.5" />
                New
              </div>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 text-sidebar-foreground hover:text-sidebar-foreground/80"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="p-4 md:p-8 max-w-6xl mx-auto w-full pb-20 md:pb-8">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Tab Bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-sidebar border-t border-sidebar-border flex">
          {navigation.map((item) => (
            <Link key={item.name} href={item.href} className="flex-1">
              <div
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                  isActive(item.href)
                    ? "text-primary"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </div>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
