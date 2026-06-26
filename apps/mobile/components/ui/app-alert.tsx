import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  const insets = useSafeAreaInsets();

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

  return (
    <AlertContext.Provider value={alert}>
      {children}
      <Modal
        visible={!!config}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => {
          const cancelBtn = buttons.find((b) => b.style === "cancel");
          dismiss();
          cancelBtn?.onPress?.();
        }}
      >
        {/* dark scrim — tap to dismiss single-button alerts */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            if (buttons.length === 1) handlePress(buttons[0]!);
          }}
        >
          <View style={[StyleSheet.absoluteFill, styles.scrim]} />
        </Pressable>

        {/* sheet anchored to the bottom */}
        <View
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t border-border bg-card px-5 pt-6"
        >
          <View className="gap-2 pb-5">
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

          <View className="gap-3">
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
          </View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: "rgba(0,0,0,0.55)" },
});

export function useAppAlert(): AlertFn {
  const fn = useContext(AlertContext);
  if (!fn) throw new Error("useAppAlert must be used inside AppAlertProvider");
  return fn;
}
