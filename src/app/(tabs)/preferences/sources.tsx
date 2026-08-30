import { useQuery } from "@tanstack/react-query";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet } from "react-native";

import { fetchSources } from "@/api/articles";
import LegalDocumentScreen from "@/components/legal-document-screen";
import PageHeader from "@/components/page-header";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { getSourceDisplayName } from "@/constants/source-names";
import { useLanguagePreference } from "@/contexts/language-preference";
import { useSourcesPreference } from "@/contexts/sources-preference";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/translations";

// A pushed screen with a checkmarked list, like language.tsx - but
// multi-select (toggles membership, no auto router.back() on press) since
// picking sources is a set of choices, not a single one. The list itself
// changes with the active language (fetchSources), since each language has
// its own, mostly disjoint set of publishers.
export default function SourcesScreen() {
  const { language } = useLanguagePreference();
  const { selectedSources, setSelectedSources } = useSourcesPreference();
  const { t } = useTranslation();
  const theme = useTheme();

  const { data } = useQuery({
    queryKey: ["sources", language],
    queryFn: () => fetchSources(language),
  });
  const sources = data ?? [];

  // An empty stored selection is the canonical "every source selected"
  // state (see sources-preference.tsx) - every row renders checked here,
  // not none, until the reader actually excludes something.
  const isAllSelected = selectedSources.length === 0;

  function toggleSource(source: string) {
    const current = isAllSelected ? sources : selectedSources;
    const next = current.includes(source)
      ? current.filter((s) => s !== source)
      : [...current, source];
    // Both "every source" and "no sources at all" collapse back to the
    // canonical [] state - the latter isn't a state a reader can be
    // usefully left in (an empty feed), so unchecking the last one just
    // brings every source back rather than leaving nothing selected.
    setSelectedSources(next.length === 0 || next.length === sources.length ? [] : next);
  }

  return (
    <LegalDocumentScreen
      title={t("sources")}
      renderHeader={(goBack) => (
        <PageHeader title={t("sources")} onGoBack={goBack} testIDPrefix="sources" />
      )}
    >
      <ThemedText themeColor="textSecondary" style={styles.description}>
        {t("sourcesDescription")}
      </ThemedText>

      {sources.map((source) => {
        const selected = isAllSelected || selectedSources.includes(source);
        return (
          <Pressable
            key={source}
            onPress={() => toggleSource(source)}
            style={[styles.row, { borderColor: theme.backgroundSelected }]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <ThemedText type="default" style={[selected && { color: theme.tint }]}>
              {getSourceDisplayName(source, language)}
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
  description: { marginBottom: Spacing.three },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
