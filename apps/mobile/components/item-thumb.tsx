import { useEffect, useState } from "react";
import { Image, Text, View } from "react-native";

type ItemThumbProps = {
  uri?: string | null;
  label: string;
  size?: number;
};

/**
 * Square thumbnail: shows the image when uri is available and loads
 * successfully, otherwise a muted square with the item's first letter
 * centred. Falls back to the letter placeholder if the image URL fails
 * to render (broken link, 404, unsupported format).
 */
export function ItemThumb({ uri, label, size = 56 }: ItemThumbProps) {
  const fallbackLetter = label.trim()[0] ?? "؟";
  const radius = Math.round(size * 0.25);
  const [failed, setFailed] = useState(false);

  // Reset the error state when the source changes, so a new uri gets a
  // fresh chance to load instead of inheriting the previous failure.
  useEffect(() => {
    setFailed(false);
  }, [uri]);

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: radius }}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <View
      style={{ width: size, height: size, borderRadius: radius }}
      className="items-center justify-center bg-elevated"
    >
      <Text className="font-display text-base font-semibold text-muted-foreground">
        {fallbackLetter}
      </Text>
    </View>
  );
}
