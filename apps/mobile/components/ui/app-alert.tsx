import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import { View } from "react-native";

import { AppBottomSheet } from "./bottom-sheet";
import { Button } from "./button";
import { Typography } from "./typography";

export type AlertButton = {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
};

type AlertConfig = {
  title: string;
  message?: string;
  buttons: AlertButton[];
};

type AlertFn = (
  title: string,
  message?: string,
  buttons?: AlertButton[],
) => void;

const AlertContext = createContext<AlertFn | null>(null);

export function AppAlertProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [config, setConfig] = useState<AlertConfig | null>(null);

  const alert = useCallback<AlertFn>(
    (title, message, buttons) =>
      setConfig({ title, message, buttons: buttons ?? [{ text: "OK" }] }),
    [],
  );

  const dismiss = () => setConfig(null);

  const handlePress = (btn: AlertButton) => {
    dismiss();
    btn.onPress?.();
  };

  const buttons = config?.buttons ?? [];
  // destructive / default first, cancel last
  const sorted = [
    ...buttons.filter((b) => b.style !== "cancel"),
    ...buttons.filter((b) => b.style === "cancel"),
  ];

  // Hardware back / swipe-down acts as cancel.
  const onRequestClose = () => {
    const cancelBtn = buttons.find((b) => b.style === "cancel");
    dismiss();
    cancelBtn?.onPress?.();
  };

  return (
    <AlertContext.Provider value={alert}>
      {children}
      <AppBottomSheet
        visible={!!config}
        onClose={onRequestClose}
        // A backdrop tap only dismisses single-button alerts (and counts as
        // pressing that button); multi-button alerts require a choice.
        onBackdropPress={() => {
          if (buttons.length === 1) handlePress(buttons[0]!);
        }}
        footer={
          <>
            {sorted.map((btn, i) => (
              <Button
                key={i}
                label={btn.text}
                variant={
                  btn.style === "destructive"
                    ? "destructive"
                    : btn.style === "cancel"
                      ? "outline"
                      : "default"
                }
                onPress={() => handlePress(btn)}
              />
            ))}
          </>
        }
      >
        <View className="gap-2 px-5 pb-5 pt-2">
          {!!config?.title && (
            <Typography variant="heading" className="text-center">
              {config.title}
            </Typography>
          )}
          {!!config?.message && (
            <Typography
              variant="body"
              className="text-center text-muted-foreground"
            >
              {config.message}
            </Typography>
          )}
        </View>
      </AppBottomSheet>
    </AlertContext.Provider>
  );
}

export function useAppAlert(): AlertFn {
  const fn = useContext(AlertContext);
  if (!fn) throw new Error("useAppAlert must be used inside AppAlertProvider");
  return fn;
}
