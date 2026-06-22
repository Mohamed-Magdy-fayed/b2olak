"use client";

import { useQuery } from "@tanstack/react-query";

import { useTranslation } from "@workspace/i18n/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@workspace/ui/components/card";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { H1 } from "@workspace/ui/components/typography";

import { useTRPC } from "@/lib/trpc/client";

export default function AdminDashboardPage() {
  const trpc = useTRPC();
  const { t } = useTranslation();
  const { data } = useQuery(trpc.admin.dashboard.queryOptions());

  const kpis = [
    { label: t("admin.kpi.activeOrders"), value: data?.activeOrders },
    { label: t("admin.kpi.customers"), value: data?.customers },
    { label: t("admin.kpi.drivers"), value: data?.drivers },
    { label: t("admin.kpi.items"), value: data?.items },
    { label: t("admin.kpi.pendingItems"), value: data?.pendingItems },
  ];

  return (
    <div className="flex flex-col gap-6">
      <H1>{t("admin.title")}</H1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="gap-2 py-4">
            <CardContent className="flex flex-col gap-1 px-4">
              <CardDescription>{kpi.label}</CardDescription>
              <CardTitle className="text-3xl tabular-nums">
                {data ? (kpi.value ?? 0) : <Skeleton className="h-8 w-20" />}
              </CardTitle>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
