"use client";

import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";

export default function RulesPage() {
  return (
    <div className="flex flex-col">
      <Header title="Association Rules" />
      <div className="flex-1 space-y-6 p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              TODO (FE-60..64): rules table + min-lift slider + sup/conf scatter.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
