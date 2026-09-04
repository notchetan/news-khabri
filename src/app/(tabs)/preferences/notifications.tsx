import { useRouter } from "expo-router";
import { StyleSheet } from "react-native";

import CheckmarkRow from "@/components/checkmark-row";
import LegalDocumentScreen from "@/components/legal-document-screen";
import PageHeader from "@/components/page-header";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import {
  NotificationInterval,
  useNotificationPreference,
} from "@/contexts/notification-preference";
import { useTranslation } from "@/i18n/translations";

const INTERVAL_OPTIONS: NotificationInterval[] = [0, 5, 15, 30, 60, 120];

// Single-select pushed picker sharing CheckmarkRow with language.tsx and
// sources.tsx. Tapping a row selects and navigates back - unlike
// sources.tsx, which is a set, so its rows toggle in place instead.
export default function NotificationsScreen() {
  const router = useRouter();
  const { interval, setInterval } = useNotificationPreference();
  const { t } = useTranslation();

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
      {INTERVAL_OPTIONS.map((option) => (
        <CheckmarkRow
          key={option}
          label={labelFor(option)}
          selected={interval === option}
          onPress={() => {
            setInterval(option);
            router.back();
          }}
        />
      ))}
    </LegalDocumentScreen>
  );
}

const styles = StyleSheet.create({
  description: { marginBottom: Spacing.three },
});
