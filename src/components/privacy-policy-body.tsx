import { StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { LEGAL_LAST_UPDATED } from "@/constants/legal";
import { Spacing } from "@/constants/theme";

// The privacy policy's own text, lifted out of the preferences route so
// onboarding can show the identical document before the reader accepts it
// (app/onboarding/privacy.tsx). One copy behind two routes - the version a
// reader accepts at onboarding and the one they can re-read later must
// never be able to drift apart.
//
// Describes what the app actually does today, as accurately as we can put
// it - not generic boilerplate. Still not legal advice; get a real review
// before a public launch, and keep LEGAL_LAST_UPDATED and the
// account/sync/notification sections in step with the code. English-only,
// same reasoning as about.tsx: the row label that links here is localized
// (see preferences/index.tsx), the document itself isn't, because an
// approximate translation of a privacy commitment could misrepresent it.
export default function PrivacyPolicyBody() {
  return (
    <>

      <ThemedText themeColor="textSecondary" style={styles.updated}>
        Last updated: {LEGAL_LAST_UPDATED}
      </ThemedText>

      <ThemedText style={styles.paragraph}>
        News Khabri can be used without an account. Signing in is optional
        and only adds cross-device sync and personalised ranking, described
        below.
      </ThemedText>

      <ThemedText type="smallBold" style={styles.heading}>
        USING THE APP WITHOUT AN ACCOUNT
      </ThemedText>
      <ThemedText style={styles.paragraph}>
        Your appearance, language, article font-size, source, and
        notification preferences, and your saved articles, are stored only
        on your own device. Loading articles means your device requests
        them from our servers, the same as any app fetching content over
        the internet; we don't attach a personal identifier to those
        requests or build a profile of what you read.
      </ThemedText>

      <ThemedText type="smallBold" style={styles.heading}>
        IF YOU SIGN IN WITH GOOGLE
      </ThemedText>
      <ThemedText style={styles.paragraph}>
        We receive and store your Google account's name, email address,
        profile picture URL, and a stable Google account identifier, so we
        can recognise your account on a future sign-in. We use this only to
        operate your account — not for advertising, and we don't sell it.
      </ThemedText>
      <ThemedText style={styles.paragraph}>
        While you are signed in, the preferences listed above and your
        saved articles are also stored on our servers and synced to your
        account so they follow you across devices. We also record which
        articles you open while signed in, and use that history to
        personalise how stories are ranked for you. Signing out stops new
        reading history from being recorded.
      </ThemedText>

      <ThemedText type="smallBold" style={styles.heading}>
        NOTIFICATIONS
      </ThemedText>
      <ThemedText style={styles.paragraph}>
        If you turn on notifications, we store your device's push token,
        the frequency you chose, and your current language on our servers
        so we can send the trending-story notification. Turning
        notifications off stops them; the token is removed once the device
        is no longer reachable.
      </ThemedText>

      <ThemedText type="smallBold" style={styles.heading}>
        DELETING YOUR ACCOUNT AND DATA
      </ThemedText>
      <ThemedText style={styles.paragraph}>
        You can delete your account at any time from the Profile screen.
        This permanently removes your account and everything synced to it —
        your synced preferences, saved articles, and reading history. Data
        kept only on your device is cleared by signing out or uninstalling
        the app. Questions or requests: support@newskhabri.app.
      </ThemedText>

      <ThemedText type="smallBold" style={styles.heading}>
        THIRD-PARTY LINKS
      </ThemedText>
      <ThemedText style={styles.paragraph}>
        Tapping "Read on [Source]" or an article's original link opens that
        publisher's own website, outside News Khabri. Once you're there,
        their privacy policy applies, not ours. Sign-in is handled by
        Google, whose own privacy policy covers that step.
      </ThemedText>

      <ThemedText type="smallBold" style={styles.heading}>
        NO ADS OR ANALYTICS TODAY
      </ThemedText>
      <ThemedText style={styles.paragraph}>
        News Khabri doesn't currently run advertising or third-party
        analytics of any kind. If that ever changes, this policy will be
        updated first, and the change will be reflected here.
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
    </>
  );
}

const styles = StyleSheet.create({
  updated: { marginBottom: Spacing.three },
  heading: { letterSpacing: 0.5, marginTop: Spacing.four, marginBottom: Spacing.two },
  paragraph: { marginBottom: Spacing.two },
});
