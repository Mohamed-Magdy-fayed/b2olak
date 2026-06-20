import { cva, type VariantProps } from "class-variance-authority";
import { Text as RNText, type TextProps } from "react-native";

/**
 * Dark-luxury typography — the single source of truth for text styling on mobile.
 *
 * Use `<Typography variant="…">` instead of ad-hoc `<Text className="font-display
 * text-3xl">`. Unlike web, NativeWind on phones doesn't scale by viewport
 * breakpoints, so the scale here is fixed-semantic (one size per variant).
 * See docs/10-design-system.md.
 *
 * Fonts: `font-display` = El Messiri (headings), default sans = Tajawal (body),
 * applied globally — see apps/mobile/lib/fonts.ts.
 */
const textVariants = cva("", {
  variants: {
    variant: {
      /** Hero/welcome title. */
      display: "font-display text-4xl text-foreground",
      /** Standard screen title (matches ScreenHeader). */
      title: "font-display text-3xl text-foreground",
      /** Section heading inside a screen. */
      heading: "font-display text-xl text-foreground",
      /** Secondary line under a title. */
      subtitle: "text-sm text-muted-foreground",
      /** Default body copy. */
      body: "text-base text-foreground",
      /** Small print / metadata. */
      caption: "text-xs text-muted-foreground",
    },
  },
  defaultVariants: { variant: "body" },
});

type TypographyProps = TextProps &
  VariantProps<typeof textVariants> & {
    className?: string;
  };

export function Typography({
  variant,
  className,
  children,
  ...props
}: TypographyProps) {
  return (
    <RNText className={`${textVariants({ variant })} ${className ?? ""}`} {...props}>
      {children}
    </RNText>
  );
}

export { textVariants };
