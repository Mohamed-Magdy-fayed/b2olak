"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useTranslation } from "@workspace/i18n/react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { H1 } from "@workspace/ui/components/typography";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

import { useTRPC } from "@/lib/trpc/client";

export default function AdminReviewPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { t, locale } = useTranslation();

  const queueOptions = trpc.admin.review.queue.queryOptions();
  const { data: queue } = useQuery(queueOptions);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queueOptions.queryKey });

  const merge = useMutation(
    trpc.admin.review.merge.mutationOptions({ onSuccess: () => void invalidate() }),
  );
  const approve = useMutation(
    trpc.admin.review.approve.mutationOptions({
      onSuccess: () => void invalidate(),
    }),
  );

  return (
    <div className="flex flex-col gap-4">
      <H1>{t("admin.review.title")}</H1>

      {queue?.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center">
          {t("admin.review.empty")}
        </p>
      ) : null}

      {(queue ?? []).map((item) => (
        <Card key={item.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <span className="text-lg">
                {item.nameAr ?? item.nameEn ?? "—"}
                {item.nameAr && item.nameEn ? ` / ${item.nameEn}` : ""}
              </span>
              <Badge variant="warning">
                {locale === "ar" ? item.category.nameAr : item.category.nameEn}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {item.suggestions.length > 0 ? (
              <div className="flex flex-col gap-2">
                {item.suggestions.map((suggestion) => (
                  <Card
                    key={suggestion.id}
                    className="flex-row items-center justify-between gap-3 rounded-md p-3"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {suggestion.candidate.nameAr ?? "—"} /{" "}
                        {suggestion.candidate.nameEn ?? "—"}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {t("admin.review.similarity", {
                          score: suggestion.similarityScore,
                        })}
                        {suggestion.aiVerdict
                          ? ` • ${t("admin.review.aiVerdict", { verdict: suggestion.aiVerdict })}`
                          : ""}
                      </span>
                      {suggestion.aiCanonicalEn || suggestion.aiCanonicalAr ? (
                        <span className="text-muted-foreground text-xs">
                          {t("admin.review.aiNames", {
                            en: suggestion.aiCanonicalEn ?? "—",
                            ar: suggestion.aiCanonicalAr ?? "—",
                          })}
                        </span>
                      ) : null}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={merge.isPending}
                      onClick={() =>
                        merge.mutate({
                          itemId: item.id,
                          intoItemId: suggestion.candidateItemId,
                        })
                      }
                    >
                      {t("admin.review.mergeInto")}
                    </Button>
                  </Card>
                ))}
              </div>
            ) : null}
            <div>
              <Button
                size="sm"
                disabled={approve.isPending}
                onClick={() => approve.mutate({ itemId: item.id })}
              >
                {t("admin.review.approveAsNew")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
