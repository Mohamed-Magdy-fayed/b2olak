import { type ComponentProps, type ReactNode } from "react"
import { Modal, Pressable, ScrollView, Text, View } from "react-native"
import Animated from "react-native-reanimated"
import {
  KeyboardAvoidingView,
  KeyboardAwareScrollView,
  KeyboardProvider,
} from "react-native-keyboard-controller"

import { useKeyboardBottomPadding } from "@/components/ui/keyboard-insets"

/**
 * THE bottom-sheet modal primitive — every sheet in the app (quantity picker,
 * address form, select options, alerts, one-off prompts) renders through this
 * so the bottom-edge behaviour is identical everywhere:
 *
 * - The modal window is edge-to-edge (`statusBarTranslucent` +
 *   `navigationBarTranslucent`), matching the app window, so safe-area insets
 *   and keyboard heights agree — no phantom gaps.
 * - The whole sheet rides the keyboard as one unit (RNKC `KeyboardAvoidingView`
 *   with `behavior="padding"`), header staying on screen.
 * - The bottom region pads for the Android nav bar / home indicator while the
 *   keyboard is closed and collapses flush onto the keys while it's open
 *   (see `useKeyboardBottomPadding`).
 *
 * RN `Modal` renders in its own native window, so the root `KeyboardProvider`
 * does not reach inside it — a provider is nested here.
 */

type AppBottomSheetProps = {
  visible: boolean
  /** Back button / backdrop dismissal. */
  onClose: () => void
  /** Override what a backdrop tap does (defaults to `onClose`). */
  onBackdropPress?: () => void
  /** Bold centered title row under the drag handle. */
  title?: string
  /** Muted line under the title. */
  subtitle?: string
  /**
   * Pinned footer content (primary actions). Sits below the body with a top
   * border and owns the sheet's bottom inset. Omit it for a footer-less sheet
   * (a safe-area spacer still pads the bottom), or pass `null` when the
   * children render their own `SheetFooter` (e.g. a form whose buttons need
   * the form instance).
   */
  footer?: ReactNode | null
  /** Sheet body. Make it a `SheetScrollView` when the content can overflow. */
  children: ReactNode
}

export function AppBottomSheet({
  visible,
  onClose,
  onBackdropPress,
  title,
  subtitle,
  footer,
  children,
}: AppBottomSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardProvider>
        {/* `behavior="padding"` lifts the whole sheet above the keyboard as one
            unit, so the header stays on screen and the footer sits just above
            the keys. The sheet is capped and its body scrolls if it can't fit. */}
        <KeyboardAvoidingView behavior="padding" className="flex-1 justify-end">
          {/* Backdrop sits behind the sheet without taking layout space. */}
          <Pressable
            className="absolute inset-0 bg-black/60"
            onPress={onBackdropPress ?? onClose}
          />
          <View className="max-h-[85%] rounded-t-2xl bg-card">
            {/* Drag handle */}
            <View className="items-center pb-1 pt-3">
              <View className="h-1 w-10 rounded-full bg-border" />
            </View>
            {title ? (
              <View className="border-b border-border px-4 py-3">
                <Text
                  className="text-center text-lg font-bold text-foreground"
                  numberOfLines={1}
                >
                  {title}
                </Text>
                {subtitle ? (
                  <Text className="text-center text-xs text-muted-foreground">
                    {subtitle}
                  </Text>
                ) : null}
              </View>
            ) : null}
            {children}
            {footer === null ? null : footer === undefined ? (
              <SheetSpacer />
            ) : (
              <SheetFooter>{footer}</SheetFooter>
            )}
          </View>
        </KeyboardAvoidingView>
      </KeyboardProvider>
    </Modal>
  )
}

/**
 * The sheet's pinned bottom region: footer content above the animated bottom
 * inset (nav bar when the keyboard is closed, flush on the keys when open).
 * Rendered automatically from the `footer` prop; render it directly (with
 * `footer={null}`) only when the footer needs state shared with the body.
 */
export function SheetFooter({ children }: { children: ReactNode }) {
  const bottomPadding = useKeyboardBottomPadding({ gap: 12 })
  return (
    <View className="border-t border-border">
      <Animated.View
        style={[{ paddingTop: 12, paddingHorizontal: 16, gap: 8 }, bottomPadding]}
      >
        {children}
      </Animated.View>
    </View>
  )
}

/** Safe-area bottom padding for footer-less sheets. */
function SheetSpacer() {
  const bottomPadding = useKeyboardBottomPadding({ gap: 12 })
  return <Animated.View style={bottomPadding} />
}

/**
 * Scrollable sheet body preset — keyboard-aware (lifts the focused field),
 * keeps taps working while the keyboard is up, and shrinks so the pinned
 * header/footer never leave the screen.
 */
export function SheetScrollView({
  contentContainerClassName = "gap-4 py-4",
  ...props
}: ComponentProps<typeof KeyboardAwareScrollView>) {
  return (
    <KeyboardAwareScrollView
      className="shrink px-4"
      contentContainerClassName={contentContainerClassName}
      bottomOffset={24}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
      {...props}
    />
  )
}

/** Non-keyboard body scroll (e.g. option lists) with the same chrome. */
export function SheetPlainScrollView(props: ComponentProps<typeof ScrollView>) {
  return (
    <ScrollView
      className="shrink px-4"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      {...props}
    />
  )
}
