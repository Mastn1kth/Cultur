import React from "react";
import i18n from "@/i18n";
import { useTranslation } from "react-i18next";
import { Body, Button, Chip, H1, Screen } from "@/components/ui";
import { saveOnboardingStep } from "@/lib/onboarding";
import { View } from "react-native";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ru", label: "Русский" },
  { code: "es", label: "Español" },
  { code: "uk", label: "Українська" },
  { code: "tr", label: "Türkçe" },
  { code: "ar", label: "العربية" },
];

const goals = [
  { key: "friends", labelKey: "friends" },
  { key: "dating", labelKey: "dating" },
  { key: "events", labelKey: "events" },
  { key: "community", labelKey: "community" },
] as const;

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const [appLang, setAppLang] = React.useState(i18n.language);
  const [selectedGoal, setSelectedGoal] = React.useState<string>("friends");

  async function changeLang(code: string) {
    setAppLang(code);
    await i18n.changeLanguage(code);
  }

  return (
    <Screen>
      <Body muted>1 / 7</Body>
      <H1>{t("welcomeTitle")}</H1>
      <Body muted style={{ marginBottom: 8 }}>App language / Язык приложения</Body>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        {LANGUAGES.map((lang) => (
          <Chip
            key={lang.code}
            label={lang.label}
            tone={appLang === lang.code ? "primary" : "neutral"}
            onPress={() => changeLang(lang.code)}
          />
        ))}
      </View>
      <Body muted style={{ marginBottom: 4 }}>Choose your goal / Выбери цель</Body>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 16 }}>
        {goals.map((g) => (
          <Chip
            key={g.key}
            label={t(g.labelKey)}
            tone={selectedGoal === g.key ? "primary" : "neutral"}
            onPress={() => setSelectedGoal(g.key)}
          />
        ))}
      </View>
      <Button onPress={() => saveOnboardingStep("city", { goal: selectedGoal, appLanguage: appLang }, "/onboarding/city")}>
        {t("continue")}
      </Button>
    </Screen>
  );
}
