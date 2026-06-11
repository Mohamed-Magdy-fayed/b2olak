"use client";

import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { useTranslation } from "@workspace/i18n/react";
import { Button } from "@workspace/ui/components/button";

import { useTRPC } from "@/lib/trpc/client";

/** File picker → base64 → server-side Firebase upload → public URL. */
export function ImageUpload({
  value,
  folder,
  onChange,
}: {
  value: string | null | undefined;
  folder: "categories" | "items";
  onChange: (url: string | null) => void;
}) {
  const trpc = useTRPC();
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useMutation(
    trpc.admin.catalog.uploadImage.mutationOptions({
      onSuccess: (data) => onChange(data.url),
      onError: () => setError(t("errors.unknown")),
    }),
  );

  function handleFile(file: File) {
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
      upload.mutate({
        base64,
        mimeType: file.type as
          | "image/jpeg"
          | "image/png"
          | "image/webp"
          | "image/gif"
          | "image/avif",
        folder,
      });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex items-center gap-3">
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt=""
          className="size-12 rounded-md border object-cover"
        />
      ) : (
        <div className="bg-muted size-12 rounded-md border" />
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={upload.isPending}
        onClick={() => inputRef.current?.click()}
      >
        {upload.isPending ? t("admin.common.uploading") : t("admin.common.image")}
      </Button>
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(null)}
        >
          ✕
        </Button>
      ) : null}
      {error ? <span className="text-destructive text-xs">{error}</span> : null}
    </div>
  );
}
