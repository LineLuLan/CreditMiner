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

export function MobileNav() {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    if (open) {
      setMounted(true);
    } else {
      const t = setTimeout(() => setMounted(false), 220);
      return () => clearTimeout(t);
    }
  }, [open]);

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

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

      {mounted ? (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
        >
          <div
            className={cn(
              "absolute inset-0 bg-black/50 transition-opacity duration-200",
              open ? "opacity-100" : "opacity-0",
            )}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside
            className={cn(
              "relative flex h-full w-72 max-w-[80vw] flex-col border-r bg-card shadow-xl transition-transform duration-200 ease-out",
              open ? "translate-x-0" : "-translate-x-full",
            )}
          >
            <div className="flex h-16 items-center justify-between border-b px-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-lg font-bold tracking-tight"
                onClick={() => setOpen(false)}
              >
                <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
                  <Sparkles className="h-4 w-4" aria-hidden />
                </span>
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
            <div className="border-t p-4 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Demo build</p>
              <p>CRISP-DM · CreditCard churn</p>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
