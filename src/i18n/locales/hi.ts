import type en from "./en";

const hi: Record<keyof typeof en, string> = {
  tabHome: "होम",
  tabProfile: "प्रोफ़ाइल",
  // "सेटिंग्स" (Settings, a common loanword) rather than the stiffer literal
  // "प्राथमिकताएं" - same reasoning as topStoriesShort's "टॉप" below, and
  // this screen genuinely is a settings screen (appearance/font/language +
  // legal links).
  tabPreferences: "सेटिंग्स",
  articlesLoadError: "लेख लोड करने में समस्या हुई।",
  back: "वापस",
  articleLoadError: "यह लेख लोड नहीं हो सका।",
  articleContentError: "इस लेख का पूरा टेक्स्ट लोड नहीं हो सका।",
  readOnTemplate: "{source} पर पढ़ें",
  relatedArticles: "संबंधित लेख",
  imageFailedToLoad: "छवि लोड नहीं हो सकी",
  noImage: "कोई छवि नहीं",
  profileTitle: "प्रोफ़ाइल",
  profileComingSoon: "साइन-इन और वैयक्तिकरण जल्द ही आ रहे हैं।",
  preferencesTitle: "सेटिंग्स",
  appearance: "दिखावट",
  appearanceAutomaticDesc: "आपके डिवाइस की सिस्टम सेटिंग से मेल खाएं",
  appearanceDayDesc: "हमेशा हल्का रूप उपयोग करें",
  appearanceNightDesc: "हमेशा गहरा रूप उपयोग करें",
  articleFontSize: "लेख का फ़ॉन्ट आकार",
  fontPreviewText: "यह एक नमूना वाक्य है जो फ़ॉन्ट आकार दिखाता है।",
  language: "भाषा",
  languageDescription: "लेख और ऐप टेक्स्ट के लिए अपनी पसंदीदा भाषा चुनें",
  languageEnglish: "English",
  languageHindi: "हिंदी",
  languageGujarati: "गुजराती",
  languageBengali: "बंगाली",
  languageKannada: "कन्नड़",
  languageMarathi: "मराठी",
  languageMalayalam: "मलयालम",
  languageTamil: "तमिल",
  languageTelugu: "तेलुगु",
  languageOdia: "ओड़िया",
  articleImageAlt: "लेख की छवि",
  showPhotoCredit: "फ़ोटो क्रेडिट दिखाएं",
  hidePhotoCredit: "फ़ोटो क्रेडिट छुपाएं",
  loadingMore: "और लेख लोड हो रहे हैं…",
  loadingArticles: "लेख लोड हो रहे हैं…",
  loadingArticle: "लेख लोड हो रहा है…",
  fontSizeSmall: "छोटा फ़ॉन्ट आकार",
  fontSizeMedium: "मध्यम फ़ॉन्ट आकार",
  fontSizeLarge: "बड़ा फ़ॉन्ट आकार",
  minReadTemplate: "{minutes} मिनट में पढ़ें",
  scrollToFirstCategory: "पहली श्रेणी पर वापस जाएं",
  tabSearch: "खोजें",
  searchPlaceholder: "लेख खोजें",
  noArticlesFound: "कोई लेख नहीं मिला।",
  topStories: "प्रमुख ख़बरें",
  // "टॉप" (a common, widely-understood loanword in Hindi news media, e.g.
  // "टॉप न्यूज़") rather than a literal translation - "प्रमुख" alone reads
  // as an unfinished word without "ख़बरें" following it.
  topStoriesShort: "टॉप",
  // These match the existing raw category values this same app already
  // stores for Hindi sources (देश/बिजनेस/स्पोर्ट्स/विदेश - see
  // category-aliases.js on the backend), so translating through this key
  // set is a no-op for content that was already Hindi, and a real
  // translation for content whose raw category is the shared English key
  // (used by every other language's sources).
  categoryIndia: "देश",
  categoryWorld: "विदेश",
  categoryBusiness: "बिजनेस",
  categorySports: "स्पोर्ट्स",
  categoryCricket: "क्रिकेट",
  categoryEntertainment: "मनोरंजन",
  categoryTech: "टेक",
  categoryLifestyle: "लाइफस्टाइल",
  categoryEducation: "शिक्षा",
  categoryScience: "विज्ञान",
  fontSizeSampleGlyph: "अ",
  debugMode: "डिबग मोड",
  debugModeDescription:
    "प्रत्येक लेख का रैंकिंग स्कोर उसकी छवि पर एक पिल के रूप में दिखाएं, ताकि वेटिंग लॉजिक की जांच की जा सके।",
  storiesLoadError: "स्टोरी लोड करने में समस्या हुई।",
  noStoriesFound: "कोई स्टोरी नहीं मिली।",
  storySourcesTemplate: "{count} स्रोत",
  storyArticlesTemplate: "{count} लेख",
  storyUpdatedTemplate: "{time} अपडेट किया गया",
  storyMembersHeading: "इस स्टोरी को कवर करने वाले स्रोत",
  loadingStory: "स्टोरी लोड हो रही है…",
  storyLoadError: "यह स्टोरी लोड नहीं हो सकी।",
  share: "शेयर करें",
  about: "हमारे बारे में",
  privacyPolicy: "गोपनीयता नीति",
  termsOfService: "सेवा की शर्तें",
};

export default hi;
