import { useQuery } from "@tanstack/react-query";
import { StyleSheet } from "react-native";

import { fetchSources } from "@/api/articles";
import CheckmarkRow from "@/components/checkmark-row";
import ErrorState from "@/components/error-state";
import PushedScreen from "@/components/pushed-screen";
import PageHeader from "@/components/page-header";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { getSourceDisplayName } from "@/constants/source-names";
import { useLanguagePreference } from "@/contexts/language-preference";
import { useSourcesPreference } from "@/contexts/sources-preference";
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

  const { data, error, refetch } = useQuery({
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
    <PushedScreen
      title={t("sources")}
      renderHeader={(goBack) => (
        <PageHeader title={t("sources")} onGoBack={goBack} testIDPrefix="sources" />
      )}
    >
      <ThemedText themeColor="textSecondary" style={styles.description}>
        {t("sourcesDescription")}
      </ThemedText>

      {/* Without this a failed fetch rendered a blank list under the
          description, with no explanation and no way to retry - the one
          query-backed screen that never got the shared ErrorState. */}
      {error && (
        <ErrorState
          testID="sources-error"
          message={t("unexpectedError")}
          onRetry={refetch}
        />
      )}

      {sources.map((source) => (
        <CheckmarkRow
          key={source}
          label={getSourceDisplayName(source, language)}
          selected={isAllSelected || selectedSources.includes(source)}
          onPress={() => toggleSource(source)}
        />
      ))}
    </PushedScreen>
  );
}

const styles = StyleSheet.create({
  description: { marginBottom: Spacing.three },
});
