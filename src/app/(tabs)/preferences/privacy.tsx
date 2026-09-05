import PrivacyPolicyBody from "@/components/privacy-policy-body";
import PushedScreen from "@/components/pushed-screen";
import { useTranslation } from "@/i18n/translations";

// The document itself lives in components/privacy-policy-body.tsx so that
// onboarding's own copy of this route (app/onboarding/privacy.tsx) renders
// the exact same text - see that component's comment.
export default function PrivacyScreen() {
  const { t } = useTranslation();

  return (
    <PushedScreen title={t("privacy")}>
      <PrivacyPolicyBody />
    </PushedScreen>
  );
}
