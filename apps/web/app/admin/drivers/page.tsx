"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useTranslation } from "@workspace/i18n/react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { PhoneInput } from "@workspace/ui/components/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";

import { useTRPC } from "@/lib/trpc/client";

const VEHICLES = ["motorcycle", "bicycle", "car", "on_foot"] as const;
type Vehicle = (typeof VEHICLES)[number];

const vehicleKey: Record<Vehicle, "vehicleMotorcycle" | "vehicleBicycle" | "vehicleCar" | "vehicleOnFoot"> = {
  motorcycle: "vehicleMotorcycle",
  bicycle: "vehicleBicycle",
  car: "vehicleCar",
  on_foot: "vehicleOnFoot",
};

export default function AdminDriversPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicle, setVehicle] = useState<Vehicle>("motorcycle");
  const [plate, setPlate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const listOptions = trpc.admin.drivers.list.queryOptions();
  const { data: drivers } = useQuery(listOptions);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: listOptions.queryKey });

  const create = useMutation(
    trpc.admin.drivers.create.mutationOptions({
      onSuccess: () => {
        void invalidate();
        setAdding(false);
        setName("");
        setPhone("");
        setPlate("");
      },
      onError: (err) => {
        setError(
          err.message === "admin.drivers.alreadyDriver"
            ? t("admin.drivers.alreadyDriver")
            : err.message === "admin.drivers.phoneIsAdmin"
              ? t("admin.drivers.phoneIsAdmin")
              : t("validation.phoneInvalid"),
        );
      },
    }),
  );
  const setStatus = useMutation(
    trpc.admin.drivers.setStatus.mutationOptions({
      onSuccess: () => void invalidate(),
    }),
  );
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("admin.drivers.title")}</h1>
        <Button onClick={() => setAdding(true)}>{t("admin.common.add")}</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("admin.drivers.name")}</TableHead>
            <TableHead>{t("admin.drivers.phone")}</TableHead>
            <TableHead>{t("admin.drivers.vehicle")}</TableHead>
            <TableHead>{t("admin.items.status")}</TableHead>
            <TableHead>{t("admin.drivers.available")}</TableHead>
            <TableHead>{t("admin.drivers.active")}</TableHead>
            <TableHead>{t("admin.drivers.delivered")}</TableHead>
            <TableHead>{t("admin.common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(drivers ?? []).map((driver) => (
            <TableRow key={driver.id}>
              <TableCell className="font-medium">{driver.user.name}</TableCell>
              <TableCell dir="ltr">{driver.user.phone}</TableCell>
              <TableCell>
                {t(`admin.drivers.${vehicleKey[driver.vehicleType]}`)}
                {driver.vehiclePlate ? ` • ${driver.vehiclePlate}` : ""}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    driver.status === "approved"
                      ? "success"
                      : driver.status === "pending"
                        ? "warning"
                        : "destructive"
                  }
                >
                  {driver.status === "approved"
                    ? t("admin.drivers.statusApproved")
                    : driver.status === "pending"
                      ? t("admin.drivers.statusPending")
                      : t("admin.drivers.statusSuspended")}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={driver.isAvailable ? "success" : "secondary"}>
                  {driver.isAvailable
                    ? t("admin.drivers.available")
                    : t("admin.drivers.offline")}
                </Badge>
              </TableCell>
              <TableCell>{driver.activeOrders}</TableCell>
              <TableCell>{driver.deliveredOrders}</TableCell>
              <TableCell className="flex gap-2">
                {driver.status === "pending" ? (
                  <Button
                    size="sm"
                    onClick={() =>
                      setStatus.mutate({ profileId: driver.id, status: "approved" })
                    }
                  >
                    {t("admin.drivers.approve")}
                  </Button>
                ) : null}
                {driver.status !== "suspended" ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (
                        driver.activeOrders === 0 ||
                        window.confirm(t("admin.drivers.suspendWarning"))
                      ) {
                        setStatus.mutate({
                          profileId: driver.id,
                          status: "suspended",
                        });
                      }
                    }}
                  >
                    {t("admin.drivers.suspend")}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setStatus.mutate({ profileId: driver.id, status: "approved" })
                    }
                  >
                    {t("admin.drivers.reactivate")}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {drivers?.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-muted-foreground py-8 text-center">
                {t("admin.common.noResults")}
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>

      <Dialog open={adding} onOpenChange={(open) => !open && setAdding(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.drivers.addTitle")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>{t("admin.drivers.name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t("admin.drivers.phone")}</Label>
              <PhoneInput
                id="driver-phone"
                value={phone}
                onChange={(v) => { setError(null); setPhone(v); }}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t("admin.drivers.vehicle")}</Label>
              <Select
                value={vehicle}
                onValueChange={(v) => { if (v) setVehicle(v as Vehicle); }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {t(`admin.drivers.${vehicleKey[v]}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t("admin.drivers.plate")}</Label>
              <Input value={plate} onChange={(e) => setPlate(e.target.value)} />
            </div>
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              disabled={name.trim().length < 2 || phone.trim().length < 10 || create.isPending}
              onClick={() =>
                create.mutate({
                  name: name.trim(),
                  phone: phone.trim(),
                  vehicleType: vehicle,
                  vehiclePlate: plate.trim() || undefined,
                })
              }
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
