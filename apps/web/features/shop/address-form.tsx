"use client";

import { useMemo } from "react";
import { TRPCClientError } from "@trpc/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-form";

import { useTranslation } from "@workspace/i18n/react";
import { useTRPC } from "@/lib/trpc/client";
import { useAppForm } from "@/components/forms/hooks";

import { Button } from "@workspace/ui/components/button";
import { geoName } from "@/features/shop/helpers";

type AddressFormProps = {
  /** Prefill for edit mode. When undefined, we're creating. */
  initialValues?: {
    id: string;
    label: string | null;
    cityId: string | null;
    districtId: string | null;
    areaId: string | null;
    building: string | null;
    floor: string | null;
    apartment: string | null;
    landmark: string | null;
    contactPhone: string;
    isDefault: boolean;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
};

function trpcErrorMessage(error: unknown, t: (k: string) => string): string {
  if (error instanceof TRPCClientError) {
    const msg = error.message;
    if (msg.includes(".")) return t(msg);
    if (error.data?.code === "TOO_MANY_REQUESTS")
      return t("errors.tooManyRequests");
  }
  return t("errors.unknown");
}

export function AddressForm({
  initialValues,
  onSuccess,
  onCancel,
}: AddressFormProps) {
  const { t, locale } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: cities } = useQuery(trpc.geo.cities.queryOptions());

  const form = useAppForm({
    defaultValues: {
      label: initialValues?.label ?? "",
      cityId: initialValues?.cityId ?? "",
      districtId: initialValues?.districtId ?? "",
      areaId: initialValues?.areaId ?? "",
      building: initialValues?.building ?? "",
      floor: initialValues?.floor ?? "",
      apartment: initialValues?.apartment ?? "",
      landmark: initialValues?.landmark ?? "",
      contactPhone: initialValues?.contactPhone ?? "",
      isDefault: initialValues?.isDefault ?? false,
    },
    onSubmit: async ({ value }) => {
      try {
        if (initialValues?.id) {
          await updateMutation.mutateAsync({
            id: initialValues.id,
            label: value.label.trim() || undefined,
            cityId: value.cityId,
            districtId: value.districtId,
            areaId: value.areaId,
            building: value.building.trim(),
            floor: value.floor.trim() || undefined,
            apartment: value.apartment.trim() || undefined,
            landmark: value.landmark.trim() || undefined,
            contactPhone: value.contactPhone.trim(),
            isDefault: value.isDefault,
          });
        } else {
          await createMutation.mutateAsync({
            label: value.label.trim() || undefined,
            cityId: value.cityId,
            districtId: value.districtId,
            areaId: value.areaId,
            building: value.building.trim(),
            floor: value.floor.trim() || undefined,
            apartment: value.apartment.trim() || undefined,
            landmark: value.landmark.trim() || undefined,
            contactPhone: value.contactPhone.trim(),
            isDefault: value.isDefault,
          });
        }
        onSuccess?.();
      } catch (err) {
        toast.error(trpcErrorMessage(err, (k) => String(t(k as never))));
      }
    },
  });

  const cityId = useStore(form.baseStore, (s) => s.values.cityId);
  const districtId = useStore(form.baseStore, (s) => s.values.districtId);

  const { data: districts } = useQuery({
    ...trpc.geo.districts.queryOptions({ cityId }),
    enabled: !!cityId,
  });

  const { data: areas } = useQuery({
    ...trpc.geo.areas.queryOptions({ districtId }),
    enabled: !!districtId,
  });

  const cityOptions = useMemo(
    () =>
      (cities ?? []).map((c) => ({
        value: c.id,
        label: geoName(c, c.nameAr ?? c.nameEn ?? c.id, locale),
      })),
    [cities, locale],
  );

  const districtOptions = useMemo(
    () =>
      (districts ?? []).map((d) => ({
        value: d.id,
        label: geoName(d, d.nameAr ?? d.nameEn ?? d.id, locale),
      })),
    [districts, locale],
  );

  const areaOptions = useMemo(
    () =>
      (areas ?? []).map((a) => ({
        value: a.id,
        label: geoName(a, a.nameAr ?? a.nameEn ?? a.id, locale),
      })),
    [areas, locale],
  );

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: trpc.addresses.list.queryKey(),
    });

  const createMutation = useMutation(
    trpc.addresses.create.mutationOptions({
      onSuccess: () => void invalidate(),
    }),
  );

  const updateMutation = useMutation(
    trpc.addresses.update.mutationOptions({
      onSuccess: () => void invalidate(),
    }),
  );

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      className="flex flex-col gap-4"
    >
      <form.AppField
        name="label"
        children={(field) => (
          <field.StringField label={t("address.label")} />
        )}
      />

      {/* City */}
      <form.AppField
        name="cityId"
        children={(field) => (
          <field.SelectField
            label={t("address.city")}
            options={cityOptions}
            placeholder={t("address.selectCity")}
          />
        )}
        listeners={{
          onChange: () => {
            form.setFieldValue("districtId", "");
            form.setFieldValue("areaId", "");
          },
        }}
      />

      {/* District */}
      <form.AppField
        name="districtId"
        children={(field) => (
          <field.SelectField
            label={t("address.district")}
            options={districtOptions}
            placeholder={t("address.selectDistrict")}
            disabled={!cityId}
          />
        )}
        listeners={{
          onChange: () => {
            form.setFieldValue("areaId", "");
          },
        }}
      />

      {/* Area */}
      <form.AppField
        name="areaId"
        children={(field) => (
          <field.SelectField
            label={t("address.area")}
            options={areaOptions}
            placeholder={t("address.selectArea")}
            disabled={!districtId}
          />
        )}
      />

      <form.AppField
        name="building"
        validators={{
          onBlur: ({ value }) =>
            !value.trim() ? "validation.required" : undefined,
        }}
        children={(field) => (
          <field.StringField label={t("address.building")} />
        )}
      />

      <form.AppField
        name="floor"
        children={(field) => (
          <field.StringField label={t("address.floor")} />
        )}
      />

      <form.AppField
        name="apartment"
        children={(field) => (
          <field.StringField label={t("address.apartment")} />
        )}
      />

      <form.AppField
        name="landmark"
        children={(field) => (
          <field.StringField label={t("address.landmark")} />
        )}
      />

      <form.AppField
        name="contactPhone"
        children={(field) => (
          <field.PhoneField label={t("address.contactPhone")} />
        )}
      />

      <form.AppField
        name="isDefault"
        children={(field) => (
          <field.BooleanField label={t("address.isDefault")} />
        )}
      />

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending ? t("common.loading") : t("address.save")}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
        )}
      </div>
    </form>
  );
}
