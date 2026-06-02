"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { MobileNav } from "@/components/layout/MobileNav";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { NAV_ITEMS } from "@/lib/constants";

function useCrumbs(pathname: string) {
  if (pathname === "/") return [] as { href: string; label: string }[];
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { href: string; label: string }[] = [];
  let path = "";
  for (const segment of segments) {
    path += `/${segment}`;
    const navMatch = NAV_ITEMS.find((n) => n.href === path);
    const label = navMatch
      ? navMatch.label
      : decodeURIComponent(segment).replace(/-/g, " ");
    crumbs.push({ href: path, label });
  }
  return crumbs;
}

export function Header({ title }: { title: string }) {
  const pathname = usePathname();
  const crumbs = useCrumbs(pathname);

  return (
    <header className="flex h-16 items-center justify-between gap-2 border-b bg-card px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <MobileNav />
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight">
            {title}
          </h1>
          {crumbs.length > 0 ? (
            <nav
              aria-label="Breadcrumb"
              className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex"
            >
              <Link
                href="/"
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                <Home className="h-3 w-3" aria-hidden />
                <span className="sr-only">Home</span>
              </Link>
              {crumbs.map((crumb, idx) => {
                const last = idx === crumbs.length - 1;
                return (
                  <span key={crumb.href} className="inline-flex items-center gap-1">
                    <ChevronRight className="h-3 w-3" aria-hidden />
                    {last ? (
                      <span aria-current="page" className="text-foreground">
                        {crumb.label}
                      </span>
                    ) : (
                      <Link href={crumb.href} className="hover:text-foreground">
                        {crumb.label}
                      </Link>
                    )}
                  </span>
                );
              })}
            </nav>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  );
}
