import PrivacyPolicyBody from "@/components/privacy-policy-body";
import PushedScreen from "@/components/pushed-screen";
import { useTranslation } from "@/i18n/translations";

// The privacy policy, pushed from onboarding's welcome screen so a reader
// can actually read what they're being asked to accept without leaving the
// flow. A duplicate route rather than a link to preferences/privacy on
// purpose: that one lives inside the (tabs) group, so pushing it here would
// mount the tab bar and strand the reader in an app they haven't onboarded
// into. The document itself is shared, not copied - see
// components/privacy-policy-body.tsx.
export default function OnboardingPrivacyScreen() {
  const { t } = useTranslation();

  return (
    <PushedScreen title={t("privacy")}>
      <PrivacyPolicyBody />
    </PushedScreen>
  );
}
