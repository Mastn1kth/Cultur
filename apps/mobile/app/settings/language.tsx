import i18n from "@/i18n";
import { useTranslation } from "react-i18next";
import { Button, H1, Screen } from "@/components/ui";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ru", label: "Русский" },
  { code: "es", label: "Español" },
  { code: "tr", label: "Türkçe" },
  { code: "ar", label: "العربية" },
  { code: "uk", label: "Українська" },
];

export default function LanguageSettingsScreen() {
  const { t } = useTranslation();
  const current = i18n.language;
  return (
    <Screen>
      <H1>{t("language")}</H1>
      {LANGUAGES.map((lang) => (
        <Button key={lang.code} variant={current === lang.code ? "primary" : "ghost"} onPress={() => void i18n.changeLanguage(lang.code)}>{lang.label}</Button>
      ))}
    </Screen>
  );
}
