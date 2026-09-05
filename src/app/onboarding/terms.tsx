import PushedScreen from "@/components/pushed-screen";
import TermsOfServiceBody from "@/components/terms-of-service-body";
import { useTranslation } from "@/i18n/translations";

// The terms, pushed from onboarding's welcome screen - same reasoning as
// onboarding/privacy.tsx for why this is its own route rather than a link
// into the preferences stack.
export default function OnboardingTermsScreen() {
  const { t } = useTranslation();

  return (
    <PushedScreen title={t("legal")}>
      <TermsOfServiceBody />
    </PushedScreen>
  );
}
