"use client";

import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";

export default function ClustersPage() {
  return (
    <div className="flex flex-col">
      <Header title="Customer Segments" />
      <div className="flex-1 space-y-6 p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              TODO (FE-50..54): 2D PCA scatter + persona cards + cluster-customers drawer.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
