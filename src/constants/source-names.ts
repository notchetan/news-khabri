import type { Language } from "@/contexts/language-preference";

// Best-effort native-script renderings for publisher names whose own
// registered `source` value (used for API filtering, so never changed
// here) is in Roman script even within a non-English language's own
// source list - e.g. Hindi's sources are registered as "Aaj Tak", "NDTV
// Khabar" etc. (see the backend's ingestion/discovery.js), not their
// Devanagari names, unlike the rest of that language's UI. Shown as
// "<native script> (<registered name>)" on the Sources preference screen
// only - every other part of the app (API calls, AsyncStorage, article
// rows) keeps using the plain registered name. English needs no entries
// since its own sources are already in English.
const NATIVE_SOURCE_NAMES: Partial<Record<Language, Record<string, string>>> = {
  hi: {
    "NDTV Khabar": "एनडीटीवी खबर",
    "Amar Ujala": "अमर उजाला",
    "Aaj Tak": "आज तक",
    "Dainik Bhaskar": "दैनिक भास्कर",
  },
  gu: {
    "Divya Bhaskar": "દિવ્ય ભાસ્કર",
  },
  bn: {
    "ABP Live": "এবিপি লাইভ",
  },
  kn: {
    "Vijay Karnataka": "ವಿಜಯ ಕರ್ನಾಟಕ",
    Prajavani: "ಪ್ರಜಾವಾಣಿ",
  },
  mr: {
    "Maharashtra Times": "महाराष्ट्र टाइम्स",
  },
  ml: {
    "Samayam Malayalam": "സമയം മലയാളം",
    Mathrubhumi: "മാതൃഭൂമി",
  },
  ta: {
    "Samayam Tamil": "சமயம் தமிழ்",
  },
  te: {
    "Samayam Telugu": "సమయం తెలుగు",
  },
  or: {
    OdishaTV: "ଓଡ଼ିଶା ଟିଭି",
    Pragativadi: "ପ୍ରଗତିବାଦୀ",
  },
};

export function getSourceDisplayName(source: string, language: Language): string {
  const native = NATIVE_SOURCE_NAMES[language]?.[source];
  return native ? `${native} (${source})` : source;
}
