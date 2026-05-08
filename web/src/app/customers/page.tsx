"use client";

import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Customer browser (/customers). TODO: FE-40..45.
 */
export default function CustomersPage() {
  return (
    <div className="flex flex-col">
      <Header title="Customers" />
      <div className="flex-1 space-y-6 p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              TODO (FE-40..45): server-side paginated DataTable with filter/sort and a row-click drawer.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
