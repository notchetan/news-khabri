import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { SFSymbol, SymbolView } from "expo-symbols";
import { Platform, StyleSheet, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OnboardingDots } from "@/components/onboarding-dots";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing } from "@/constants/theme";
import { useOnboardingSwipe } from "@/hooks/use-onboarding-swipe";
import { useTheme } from "@/hooks/use-theme";
import { TranslationKey, useTranslation } from "@/i18n/translations";

const FEATURES: {
  sf: SFSymbol;
  ionicon: keyof typeof Ionicons.glyphMap;
  titleKey: TranslationKey;
  descKey: TranslationKey;
}[] = [
  {
    sf: "nosign",
    ionicon: "ban-outline",
    titleKey: "onboardingFeatureNoAdsTitle",
    descKey: "onboardingFeatureNoAdsDesc",
  },
  {
    sf: "globe",
    ionicon: "globe-outline",
    titleKey: "onboardingFeatureLanguageTitle",
    descKey: "onboardingFeatureLanguageDesc",
  },
  {
    sf: "checklist",
    ionicon: "list-outline",
    titleKey: "onboardingFeatureSourcesTitle",
    descKey: "onboardingFeatureSourcesDesc",
  },
  {
    sf: "bell.badge",
    ionicon: "notifications-outline",
    titleKey: "onboardingFeatureNotificationsTitle",
    descKey: "onboardingFeatureNotificationsDesc",
  },
];

// Screen 2 of 3 - see onboarding/_layout.tsx.
export default function OnboardingFeaturesScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const swipeGesture = useOnboardingSwipe({
    onPrevious: () => router.back(),
    onNext: () => router.push("/onboarding/sign-in"),
  });

  const topPadding = Platform.select({ default: insets.top, web: Spacing.six });
  const bottomPadding = insets.bottom + Spacing.five;

  return (
    <GestureDetector gesture={swipeGesture}>
      <ThemedView
        style={[styles.container, { paddingTop: topPadding, paddingBottom: bottomPadding }]}
      >
        <View style={styles.content}>
          <ThemedText type="subtitle" style={styles.title} accessibilityRole="header">
            {t("onboardingFeaturesTitle")}
          </ThemedText>

          {FEATURES.map((feature) => (
            <View key={feature.titleKey} style={styles.featureRow}>
              <ThemedView type="backgroundElement" style={styles.iconCircle}>
                <SymbolView
                  name={feature.sf}
                  size={22}
                  tintColor={theme.tint}
                  fallback={<Ionicons name={feature.ionicon} size={22} color={theme.tint} />}
                />
              </ThemedView>
              <View style={styles.featureText}>
                <ThemedText type="default" style={styles.featureTitle}>
                  {t(feature.titleKey)}
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.featureDesc}>
                  {t(feature.descKey)}
                </ThemedText>
              </View>
            </View>
          ))}
        </View>

        {/* Sibling of content, not a child of it - see index.tsx's own
            comment on why this is what keeps the dots at the same bottom
            position across every onboarding screen. */}
        <OnboardingDots total={3} current={1} />
      </ThemedView>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center" },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.five,
    gap: Spacing.four,
  },
  title: { marginBottom: Spacing.two },
  featureRow: { flexDirection: "row", alignItems: "center", gap: Spacing.three },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: { flex: 1 },
  featureTitle: { fontWeight: "700" },
  featureDesc: { marginTop: Spacing.half },
});
