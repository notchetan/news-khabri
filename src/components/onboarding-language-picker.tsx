import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { LANGUAGE_ENDONYMS, LANGUAGE_OPTIONS } from "@/constants/languages";
import { Radius, Spacing } from "@/constants/theme";
import { useLanguagePreference } from "@/contexts/language-preference";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/translations";

// Inline dropdown on the welcome screen (not a pushed picker screen like
// preferences/language.tsx) - picking a language here immediately re-renders
// the rest of onboarding in it, since every screen shares the same
// useLanguagePreference()-backed useTranslation().
export function OnboardingLanguagePicker({ style }: { style?: ViewStyle }) {
  const { language, setLanguage } = useLanguagePreference();
  const { t } = useTranslation();
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={[styles.container, style]}>
      <Pressable
        testID="onboarding-language-toggle"
        onPress={() => setIsOpen((open) => !open)}
        style={[styles.pill, { backgroundColor: theme.backgroundElement }]}
        accessibilityRole="button"
        accessibilityLabel={t("language")}
        accessibilityState={{ expanded: isOpen }}
      >
        <SymbolView
          name="globe"
          size={14}
          tintColor={theme.text}
          fallback={<ThemedText style={styles.glyph}>🌐</ThemedText>}
        />
        <ThemedText type="small">{LANGUAGE_ENDONYMS[language]}</ThemedText>
        <SymbolView
          name="chevron.down"
          size={12}
          weight="semibold"
          tintColor={theme.textSecondary}
          fallback={<ThemedText style={styles.chevronFallback}>⌄</ThemedText>}
        />
      </Pressable>

      {isOpen && (
        <ThemedView
          type="backgroundElement"
          style={[styles.dropdown, { borderColor: theme.backgroundSelected }]}
        >
          {/* Every language at once, no scroll - a scrollable list here
              risks a reader never realizing there's more below the fold
              and missing their own language entirely. */}
          {LANGUAGE_OPTIONS.map((option) => {
            const selected = language === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  setLanguage(option.value);
                  setIsOpen(false);
                }}
                style={styles.row}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <ThemedText type="small" style={[selected && { color: theme.tint }]}>
                  {LANGUAGE_ENDONYMS[option.value]}
                </ThemedText>
                {selected && (
                  <SymbolView
                    name="checkmark"
                    size={14}
                    weight="semibold"
                    tintColor={theme.tint}
                    fallback={<ThemedText style={{ color: theme.tint }}>✓</ThemedText>}
                  />
                )}
              </Pressable>
            );
          })}
        </ThemedView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // The pill itself is in-flow, directly below the welcome screen's own
  // catchphrase - but the expanded list is a popup (position: "absolute",
  // sized to just the pill since the list is removed from flow) so opening
  // it never shifts the dots/content below it.
  container: { alignItems: "center" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.full,
  },
  glyph: { fontSize: 14 },
  chevronFallback: { fontSize: 14, fontWeight: "700" },
  dropdown: {
    position: "absolute",
    top: "100%",
    marginTop: Spacing.one,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    zIndex: 10,
    elevation: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.three,
    // Tighter than a typical row (Spacing.two) - all 10 languages render at
    // once with no scroll (see the comment above), so keeping each row
    // compact matters for fitting comfortably above the bottom edge on
    // shorter screens.
    paddingVertical: Spacing.one,
    minWidth: 160,
  },
});
