import { useRouter } from "expo-router";
import { Image, Platform, ScrollView, StyleSheet } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OnboardingDots } from "@/components/onboarding-dots";
import { OnboardingLanguagePicker } from "@/components/onboarding-language-picker";
import { OnboardingNextButton } from "@/components/onboarding-next-button";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useOnboardingSwipe } from "@/hooks/use-onboarding-swipe";
import { useTranslation } from "@/i18n/translations";

// Screen 1 of 3 - see onboarding/_layout.tsx. No swipe-right target since
// there's nothing before this screen. See docs/onboarding.md for why the
// language picker lives on this screen specifically.
export default function OnboardingWelcomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const goNext = () => router.push("/onboarding/features");
  const swipeGesture = useOnboardingSwipe({ onNext: goNext });

  const topPadding = Platform.select({ default: insets.top, web: Spacing.six });
  const bottomPadding = insets.bottom + Spacing.five;

  return (
    <GestureDetector gesture={swipeGesture}>
      <ThemedView
        style={[styles.container, { paddingTop: topPadding, paddingBottom: bottomPadding }]}
      >
        {/* Scrollable so a small screen at a large font size can still
            reach the buttons below - this is the one flow every reader
            has to complete. flexGrow (not flex) on the content block so
            it still absorbs the slack that keeps the dots aligned across
            all three screens, without being allowed to shrink below its
            own content. */}
        <ScrollView
          testID="onboarding-scroll"
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
        <ThemedView style={styles.content}>
          <Image
            source={require("@/assets/images/splash-icon.png")}
            style={styles.logo}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
          <ThemedText type="title" style={styles.appName} accessibilityRole="header">
            {t("appName")}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.catchphrase}>
            {t("onboardingCatchphrase")}
          </ThemedText>
          <OnboardingLanguagePicker style={styles.languagePicker} />
        </ThemedView>

        <OnboardingNextButton onPress={goNext} style={styles.nextButton} />

        {/* Sibling of content, not a child of it - see
            onboarding-dots.tsx's own comment: this is what makes the dots
            land at the exact same bottom position on every onboarding
            screen regardless of how tall that screen's own content is,
            since content's flexGrow absorbs all the leftover space above it. */}
        <OnboardingDots total={3} current={0} />
        </ScrollView>
      </ThemedView>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // Explicit flex:1 - see AGENTS.md ScrollView-needs-explicit-flex lesson.
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: "center" },
  content: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.five,
  },
  logo: { width: 140, height: 140 },
  appName: { marginTop: Spacing.four, textAlign: "center" },
  catchphrase: { marginTop: Spacing.two, textAlign: "center" },
  languagePicker: { marginTop: Spacing.four },
  nextButton: { marginBottom: Spacing.five },
});
