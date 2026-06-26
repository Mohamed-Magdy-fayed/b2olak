import { type ReactElement } from "react"
import { Keyboard, TouchableWithoutFeedback } from "react-native"

/**
 * Wrap a non-scrolling screen (e.g. the centered auth flow) so a tap on any
 * empty space dismisses the keyboard. Nested inputs/buttons keep working —
 * they capture the touch themselves; only taps that fall through reach here.
 *
 * Scroll/list screens don't need this: `keyboardShouldPersistTaps="handled"`
 * already dismisses the keyboard on a tap outside an input.
 */
export function DismissKeyboard({ children }: { children: ReactElement }) {
  return (
    <TouchableWithoutFeedback accessible={false} onPress={() => Keyboard.dismiss()}>
      {children}
    </TouchableWithoutFeedback>
  )
}
