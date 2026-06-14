import { Image, Text, View } from "react-native";

type ItemThumbProps = {
  uri?: string | null;
  label: string;
  size?: number;
};

/**
 * Square thumbnail: shows the image when uri is available,
 * otherwise a muted square with the item's first letter centred.
 */
export function ItemThumb({ uri, label, size = 56 }: ItemThumbProps) {
  const fallbackLetter = label.trim()[0] ?? "؟";
  const radius = Math.round(size * 0.25);

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: radius }}
        resizeMode="cover"
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
