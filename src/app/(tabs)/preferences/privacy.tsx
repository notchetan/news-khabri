import { StyleSheet } from "react-native";

import LegalDocumentScreen from "@/components/legal-document-screen";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTranslation } from "@/i18n/translations";

// DRAFT - reflects what the app actually does today as accurately as
// possible, not generic boilerplate, but this is not legal advice and
// should get a real review before shipping publicly. English-only, same
// reasoning as about.tsx.
export default function PrivacyScreen() {
  const { t } = useTranslation();

  return (
    <LegalDocumentScreen title={t("privacyPolicy")}>
      <ThemedText themeColor="textSecondary" style={styles.updated}>
        Last updated: August 27, 2026
      </ThemedText>

      <ThemedText type="smallBold" style={styles.heading}>
        WHAT WE COLLECT
      </ThemedText>
      <ThemedText style={styles.paragraph}>
        News Khabri doesn't require an account or sign-up, and we don't
        collect your name, email, or any personal identifier. Your
        appearance, language, and article font-size preferences are saved
        only on your own device and are never sent to us.
      </ThemedText>

      <ThemedText type="smallBold" style={styles.heading}>
        WHAT HAPPENS WHEN YOU USE THE APP
      </ThemedText>
      <ThemedText style={styles.paragraph}>
        Loading articles means your device requests them from our servers,
        the same as any app fetching content over the internet. We don't
        attach a personal identifier to these requests or build a profile
        of what you read.
      </ThemedText>

      <ThemedText type="smallBold" style={styles.heading}>
        THIRD-PARTY LINKS
      </ThemedText>
      <ThemedText style={styles.paragraph}>
        Tapping "Read on [Source]" or an article's original link opens that
        publisher's own website, outside News Khabri. Once you're there,
        their privacy policy applies, not ours.
      </ThemedText>

      <ThemedText type="smallBold" style={styles.heading}>
        NO ADS OR ANALYTICS TODAY
      </ThemedText>
      <ThemedText style={styles.paragraph}>
        News Khabri doesn't currently run advertising or analytics of any
        kind. If that ever changes, this policy will be updated first, and
        the change will be reflected here.
      </ThemedText>

      <ThemedText type="smallBold" style={styles.heading}>
        CHANGES TO THIS POLICY
      </ThemedText>
      <ThemedText style={styles.paragraph}>
        We may update this policy as the app changes. Material changes will
        be reflected in the "Last updated" date above.
      </ThemedText>

      <ThemedText type="smallBold" style={styles.heading}>
        CONTACT
      </ThemedText>
      <ThemedText style={styles.paragraph}>
        Questions about this policy? Reach us at support@newskhabri.app.
      </ThemedText>
    </LegalDocumentScreen>
  );
}

const styles = StyleSheet.create({
  updated: { marginBottom: Spacing.three },
  heading: { letterSpacing: 0.5, marginTop: Spacing.four, marginBottom: Spacing.two },
  paragraph: { marginBottom: Spacing.two },
});
