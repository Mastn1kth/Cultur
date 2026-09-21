import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import { I18nManager } from "react-native";
import ar from "./ar.json";
import en from "./en.json";
import es from "./es.json";
import ru from "./ru.json";
import tr from "./tr.json";
import uk from "./uk.json";

if (Localization.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

const language = Localization.getLocales()[0]?.languageCode ?? "en";
const supportedLanguage = ["ar", "en", "es", "ru", "tr", "uk"].includes(language) ? language : "en";

void i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: ar },
    en: { translation: en },
    es: { translation: es },
    ru: { translation: ru },
    tr: { translation: tr },
    uk: { translation: uk }
  },
  lng: supportedLanguage,
  fallbackLng: "en",
  interpolation: { escapeValue: false }
});

export default i18n;
