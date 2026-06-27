import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react"
import type { TextInput, TextInputProps } from "react-native"

type Entry = RefObject<TextInput | null>

type FocusChain = {
  register: (entry: Entry) => () => void
  focusNext: (entry: Entry) => boolean
}

const FocusChainContext = createContext<FocusChain | null>(null)

/**
 * Lets the text inputs rendered beneath it hand focus to one another. Each input
 * registers via `useFocusChainField`; pressing the keyboard's "next" key then
 * focuses the following registered input. Registration is mount-ordered, which
 * matches render/visual order for our static forms. Non-text fields (selects,
 * switches) don't register, so "next" naturally skips over them.
 *
 * Scope it around a form's fields (e.g. the address form). Inputs outside any
 * provider just behave normally — the hook is a no-op without one.
 */
export function FocusChainProvider({ children }: { children: ReactNode }) {
  const entries = useRef<Entry[]>([])

  const register = useCallback((entry: Entry) => {
    entries.current.push(entry)
    return () => {
      entries.current = entries.current.filter((e) => e !== entry)
    }
  }, [])

  const focusNext = useCallback((entry: Entry) => {
    const list = entries.current
    const start = list.indexOf(entry)
    for (let i = start + 1; i < list.length; i++) {
      const next = list[i]?.current
      if (next) {
        next.focus()
        return true
      }
    }
    return false
  }, [])

  return (
    <FocusChainContext.Provider value={{ register, focusNext }}>
      {children}
    </FocusChainContext.Provider>
  )
}

type FocusChainFieldProps = {
  ref: RefObject<TextInput | null>
  returnKeyType?: TextInputProps["returnKeyType"]
  submitBehavior?: TextInputProps["submitBehavior"]
  onSubmitEditing?: TextInputProps["onSubmitEditing"]
}

/**
 * Wires a single-line text field into the surrounding `FocusChainProvider`.
 * Spread the result onto the shared `Input`: a ref plus the "next" return key
 * and an `onSubmitEditing` that advances to the next field (or dismisses the
 * keyboard on the last one). Returns just a ref when there's no provider, so
 * the field behaves exactly as before outside a chain.
 */
export function useFocusChainField(): FocusChainFieldProps {
  const ref = useRef<TextInput | null>(null)
  const chain = useContext(FocusChainContext)

  useEffect(() => {
    if (!chain) return
    return chain.register(ref)
  }, [chain])

  if (!chain) return { ref }

  return {
    ref,
    returnKeyType: "next",
    // Keep the keyboard up so focus can move to the next field without a flicker.
    submitBehavior: "submit",
    onSubmitEditing: () => {
      if (!chain.focusNext(ref)) ref.current?.blur()
    },
  }
}
