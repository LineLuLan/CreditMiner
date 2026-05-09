"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Filter,
  LayoutDashboard,
  Lightbulb,
  Menu,
  Network,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { APP_NAME, NAV_ITEMS } from "@/lib/constants";

const ICON_MAP = {
  LayoutDashboard,
  BarChart3,
  Users,
  Network,
  Filter,
  Sparkles,
  Lightbulb,
} as const;

/**
 * Mobile-only navigation: hamburger button + slide-in drawer.
 * Hidden at md+ where the desktop {@code Sidebar} takes over.
 */
export function MobileNav() {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  // Close on navigation
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Lock body scroll while open
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative flex h-full w-72 max-w-[80vw] flex-col border-r bg-card shadow-lg">
            <div className="flex h-16 items-center justify-between border-b px-4">
              <Link
                href="/"
                className="text-lg font-bold tracking-tight"
                onClick={() => setOpen(false)}
              >
                {APP_NAME}
              </Link>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close navigation"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-4">
              {NAV_ITEMS.map((item) => {
                const Icon = ICON_MAP[item.icon as keyof typeof ICON_MAP];
                const active =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t p-4 text-xs text-muted-foreground">v0.1.0-skeleton</div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
