import React from "react";
import { useTranslation } from "react-i18next";
import { Body, Button, Chip, H1, Screen } from "@/components/ui";
import { saveOnboardingStep } from "@/lib/onboarding";
import { View } from "react-native";

const LANGUAGES = ["English", "Russian", "Spanish", "Arabic", "Turkish", "Ukrainian", "French", "German", "Uzbek", "Chinese"];

export default function OnboardingLanguages() {
  const { t } = useTranslation();
  const [selected, setSelected] = React.useState<Set<string>>(new Set(["English"]));

  function toggle(lang: string) {
    const next = new Set(selected);
    if (next.has(lang)) next.delete(lang);
    else next.add(lang);
    setSelected(next);
  }

  return (
    <Screen>
      <Body muted>3 / 7</Body>
      <H1>{t("languagesStep")}</H1>
      <Body muted>{t("languagesLabel")}</Body>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 16 }}>
        {LANGUAGES.map((l) => (
          <Chip key={l} label={l} tone={selected.has(l) ? "primary" : "neutral"} onPress={() => toggle(l)} />
        ))}
      </View>
      <Button
        disabled={selected.size === 0}
        onPress={() => saveOnboardingStep("culture", { languages: Array.from(selected) }, "/onboarding/culture")}
      >
        {t("continue")}
      </Button>
    </Screen>
  );
}
