"use client";

import * as React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import { makeQueryClient } from "@/lib/query-client";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(() => makeQueryClient());
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
