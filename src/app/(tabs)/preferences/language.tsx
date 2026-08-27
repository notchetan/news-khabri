import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet } from "react-native";

import LegalDocumentScreen from "@/components/legal-document-screen";
import { ThemedText } from "@/components/themed-text";
import { LANGUAGE_ENDONYMS, LANGUAGE_OPTIONS } from "@/constants/languages";
import { Spacing } from "@/constants/theme";
import { useLanguagePreference } from "@/contexts/language-preference";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/translations";

// A pushed screen with a checkmarked list, not a modal sheet - the same
// pattern iOS's own Settings app uses for a setting with more than a
// handful of options (Settings > General > Language & Region pushes a new
// screen rather than presenting a sheet over the current one), and
// consistent with how About/Privacy/Terms already navigate in this app.
export default function LanguageScreen() {
  const router = useRouter();
  const { language, setLanguage } = useLanguagePreference();
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <LegalDocumentScreen title={t("language")}>
      {LANGUAGE_OPTIONS.map((option) => {
        const selected = language === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              setLanguage(option.value);
              router.back();
            }}
            style={[styles.row, { borderColor: theme.backgroundSelected }]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <ThemedText type="default" style={[selected && { color: theme.tint }]}>
              {LANGUAGE_ENDONYMS[option.value]}
            </ThemedText>
            {selected && (
              <SymbolView
                name="checkmark"
                size={16}
                weight="semibold"
                tintColor={theme.tint}
                fallback={<ThemedText style={{ color: theme.tint }}>✓</ThemedText>}
              />
            )}
          </Pressable>
        );
      })}
    </LegalDocumentScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
