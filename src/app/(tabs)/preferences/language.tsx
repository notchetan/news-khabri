import { useRouter } from "expo-router";

import CheckmarkRow from "@/components/checkmark-row";
import LegalDocumentScreen from "@/components/legal-document-screen";
import PageHeader from "@/components/page-header";
import { LANGUAGE_ENDONYMS, LANGUAGE_OPTIONS } from "@/constants/languages";
import { useLanguagePreference } from "@/contexts/language-preference";
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

  return (
    <LegalDocumentScreen
      title={t("language")}
      renderHeader={(goBack) => (
        <PageHeader title={t("language")} onGoBack={goBack} testIDPrefix="language" />
      )}
    >
      {LANGUAGE_OPTIONS.map((option) => (
        <CheckmarkRow
          key={option.value}
          label={LANGUAGE_ENDONYMS[option.value]}
          selected={language === option.value}
          onPress={() => {
            setLanguage(option.value);
            router.back();
          }}
        />
      ))}
    </LegalDocumentScreen>
  );
}
