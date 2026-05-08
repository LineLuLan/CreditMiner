"use client";

import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Exploratory Data Analysis (/eda).
 *
 * <p>3 tabs: Distribution / Correlation / Churn-by.
 * Wired to /api/eda/* — see hooks {@code useEdaDistribution} etc.</p>
 *
 * <p>TODO: implement charts in tasks FE-30..34. Currently stub.</p>
 */
export default function EdaPage() {
  return (
    <div className="flex flex-col">
      <Header title="Exploratory Data Analysis" />
      <div className="flex-1 space-y-6 p-6">
        <Tabs defaultValue="distribution">
          <TabsList>
            <TabsTrigger value="distribution">Distribution</TabsTrigger>
            <TabsTrigger value="correlation">Correlation</TabsTrigger>
            <TabsTrigger value="churn-by">Churn by dimension</TabsTrigger>
          </TabsList>
          <TabsContent value="distribution">
            <Card>
              <CardHeader>
                <CardTitle>Single-column histogram</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  TODO (FE-31): column dropdown + histogram + bins slider.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="correlation">
            <Card>
              <CardHeader>
                <CardTitle>Correlation heatmap</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  TODO (FE-32): Pearson correlation heatmap.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="churn-by">
            <Card>
              <CardHeader>
                <CardTitle>Churn rate grouped by dimension</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  TODO (FE-33): pick dim → bar chart of churn rates per group.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
