"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Filter,
  LayoutDashboard,
  Lightbulb,
  Network,
  Sparkles,
  Users,
} from "lucide-react";
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

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card md:flex md:flex-col">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/" className="text-lg font-bold tracking-tight">
          {APP_NAME}
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {NAV_ITEMS.map((item) => {
          const Icon = ICON_MAP[item.icon as keyof typeof ICON_MAP];
          const active =
            pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
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
        v0.1.0-skeleton
      </div>
    </aside>
  );
}
