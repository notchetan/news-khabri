import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet } from "react-native";

import LegalDocumentScreen from "@/components/legal-document-screen";
import PageHeader from "@/components/page-header";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import {
  NotificationInterval,
  useNotificationPreference,
} from "@/contexts/notification-preference";
import { useTheme } from "@/hooks/use-theme";
import { useTranslation } from "@/i18n/translations";

const INTERVAL_OPTIONS: NotificationInterval[] = [0, 5, 15, 30, 60, 120];

// Single-select pushed picker, same shape as language.tsx (checkmarked
// list, tap selects and navigates back) - unlike sources.tsx, this is one
// choice, not a set, so there's no multi-select/Select-all-Clear-all here.
export default function NotificationsScreen() {
  const router = useRouter();
  const { interval, setInterval } = useNotificationPreference();
  const { t } = useTranslation();
  const theme = useTheme();

  const labelFor = (value: NotificationInterval) =>
    value === 0
      ? t("notificationsOff")
      : t("notificationsEveryMinutesTemplate", { minutes: String(value) });

  return (
    <LegalDocumentScreen
      title={t("notifications")}
      renderHeader={(goBack) => (
        <PageHeader
          title={t("notifications")}
          onGoBack={goBack}
          testIDPrefix="notifications"
        />
      )}
    >
      <ThemedText themeColor="textSecondary" style={styles.description}>
        {t("notificationsDescription")}
      </ThemedText>
      {INTERVAL_OPTIONS.map((option) => {
        const selected = interval === option;
        return (
          <Pressable
            key={option}
            onPress={() => {
              setInterval(option);
              router.back();
            }}
            style={[styles.row, { borderColor: theme.backgroundSelected }]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <ThemedText type="default" style={[selected && { color: theme.tint }]}>
              {labelFor(option)}
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
