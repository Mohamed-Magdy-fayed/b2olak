import { type ComponentProps, type ReactNode } from "react"
import { Modal, Pressable, ScrollView, Text, View } from "react-native"
import Animated from "react-native-reanimated"
import {
  KeyboardAvoidingView,
  KeyboardAwareScrollView,
  KeyboardProvider,
  KeyboardStickyView,
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
 * - The bottom region pads for the Android nav bar / home indicator while the
 *   keyboard is closed and collapses flush onto the keys while it's open
 *   (see `useKeyboardBottomPadding`).
 *
 * Keyboard avoidance is ONE mechanism per sheet, chosen by `avoid`:
 *
 * - `"lift"` (default) — the whole sheet rides above the keyboard as a unit
 *   (RNKC `KeyboardAvoidingView`). The body must be a plain scroll
 *   (`SheetScrollView`) — NEVER a keyboard-aware one, which would inset the
 *   content a second time and leave a keyboard-sized hole in the sheet.
 *   Right for short sheets (quantity picker, alerts, confirmations).
 * - `"inset"` — the sheet stays anchored at the bottom; the body is a
 *   keyboard-aware scroll (`SheetFormScrollView`) that lifts the focused
 *   field, and the footer is sticky (rides the keyboard on its own). Right
 *   for tall forms (address editor) where the sheet is bigger than the
 *   space left above the keyboard.
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
  /** Keyboard-avoidance strategy — see the component doc. */
  avoid?: "lift" | "inset"
  /**
   * Pinned footer content (primary actions). Sits below the body with a top
   * border and owns the sheet's bottom inset. Omit it for a footer-less sheet
   * (a safe-area spacer still pads the bottom), or pass `null` when the
   * children render their own `SheetFooter` (e.g. a form whose buttons need
   * the form instance).
   */
  footer?: ReactNode | null
  /** Sheet body. `SheetScrollView` (lift) / `SheetFormScrollView` (inset). */
  children: ReactNode
}

export function AppBottomSheet({
  visible,
  onClose,
  onBackdropPress,
  title,
  subtitle,
  avoid = "lift",
  footer,
  children,
}: AppBottomSheetProps) {
  const sticky = avoid === "inset"

  const sheet = (
    <>
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
          <SheetFooter sticky={sticky}>{footer}</SheetFooter>
        )}
      </View>
    </>
  )

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
        {avoid === "lift" ? (
          // `behavior="padding"` lifts the whole sheet above the keyboard as
          // one unit, so the header stays on screen and the footer sits just
          // above the keys.
          <KeyboardAvoidingView behavior="padding" className="flex-1 justify-end">
            {sheet}
          </KeyboardAvoidingView>
        ) : (
          <View className="flex-1 justify-end">{sheet}</View>
        )}
      </KeyboardProvider>
    </Modal>
  )
}

/**
 * The sheet's pinned bottom region: footer content above the animated bottom
 * inset (nav bar when the keyboard is closed, flush on the keys when open).
 * Rendered automatically from the `footer` prop; render it directly (with
 * `footer={null}`) only when the footer needs state shared with the body —
 * pass `sticky` when the sheet uses `avoid="inset"`.
 */
export function SheetFooter({
  children,
  sticky = false,
}: {
  children: ReactNode
  /** Ride the keyboard independently (for `avoid="inset"` sheets). */
  sticky?: boolean
}) {
  const bottomPadding = useKeyboardBottomPadding({ gap: 12 })
  const footer = (
    <View className="border-t border-border bg-card">
      <Animated.View
        style={[{ paddingTop: 12, paddingHorizontal: 16, gap: 8 }, bottomPadding]}
      >
        {children}
      </Animated.View>
    </View>
  )
  return sticky ? <KeyboardStickyView>{footer}</KeyboardStickyView> : footer
}

/** Safe-area bottom padding for footer-less sheets. */
function SheetSpacer() {
  const bottomPadding = useKeyboardBottomPadding({ gap: 12 })
  return <Animated.View style={bottomPadding} />
}

/**
 * Body scroll for `avoid="lift"` sheets. Deliberately a PLAIN ScrollView —
 * the KeyboardAvoidingView already moves the whole sheet, so a keyboard-aware
 * scroll here would inset the content a second time (a keyboard-sized empty
 * area inside the sheet).
 */
export function SheetScrollView({
  contentContainerClassName = "gap-4 py-4",
  ...props
}: ComponentProps<typeof ScrollView> & { contentContainerClassName?: string }) {
  return (
    <ScrollView
      className="shrink px-4"
      contentContainerClassName={contentContainerClassName}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
      {...props}
    />
  )
}

/**
 * Body scroll for `avoid="inset"` sheets: keyboard-aware, lifts the focused
 * field above the keyboard (and above the sticky footer via `bottomOffset`).
 */
export function SheetFormScrollView({
  contentContainerClassName = "gap-4 py-4",
  ...props
}: ComponentProps<typeof KeyboardAwareScrollView>) {
  return (
    <KeyboardAwareScrollView
      className="shrink px-4"
      contentContainerClassName={contentContainerClassName}
      // Clearance above the keyboard for the focused field: enough to also
      // clear the sticky footer riding on top of the keys.
      bottomOffset={120}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
      {...props}
    />
  )
}
