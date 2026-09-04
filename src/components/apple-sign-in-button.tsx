import { Platform, StyleSheet, type ViewStyle } from "react-native";

import { Radius } from "@/constants/theme";
import { useThemePreference } from "@/contexts/theme-preference";

// Apple's native Sign in with Apple button. iOS-only - renders nothing
// elsewhere (expo-apple-authentication is iOS-only, and App Review wants
// the real system button, not a look-alike). App Store Review Guideline
// 4.8 requires this be offered alongside Google sign-in.
export function AppleSignInButton({
  onPress,
  style,
}: {
  onPress: () => void;
  style?: ViewStyle;
}) {
  const { resolvedScheme } = useThemePreference();

  if (Platform.OS !== "ios") return null;

  const AppleAuthentication: typeof import("expo-apple-authentication") = require("expo-apple-authentication");

  return (
    <AppleAuthentication.AppleAuthenticationButton
      testID="apple-sign-in"
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      // A dark screen wants the white button; a light screen wants the
      // black one - keeps it legible on this app's own cream/near-black.
      buttonStyle={
        resolvedScheme === "dark"
          ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
          : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
      }
      cornerRadius={Radius.full}
      style={[styles.button, style]}
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  // Matches the Google button's footprint on the sign-in screens.
  button: { height: 48, minWidth: 240 },
});
