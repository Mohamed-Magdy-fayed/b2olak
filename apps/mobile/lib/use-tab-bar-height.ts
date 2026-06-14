// expo-router bundles @react-navigation/bottom-tabs but doesn't re-export this
// hook from a public entry point, so we reach into its build path here in one
// place. It returns the tab bar's full height (including the bottom safe-area
// inset), which screens use as bottom padding so content/buttons clear the bar
// under Android edge-to-edge.
export { useBottomTabBarHeight as useTabBarHeight } from "expo-router/build/react-navigation/bottom-tabs";
