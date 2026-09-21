import React from "react";
import { useTranslation } from "react-i18next";
import { Body, Button, Chip, H1, Screen } from "@/components/ui";
import { saveOnboardingStep } from "@/lib/onboarding";
import { View } from "react-native";

const CULTURES = ["Russian", "Uzbek", "Mexican", "Syrian", "Turkish", "Ukrainian", "American", "German", "French", "Chinese"];

export default function OnboardingCulture() {
  const { t } = useTranslation();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  function toggle(c: string) {
    const next = new Set(selected);
    if (next.has(c)) next.delete(c);
    else next.add(c);
    setSelected(next);
  }

  return (
    <Screen>
      <Body muted>4 / 7</Body>
      <H1>{t("cultureStep")}</H1>
      <Body muted>{t("cultureLabel")}</Body>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 16 }}>
        {CULTURES.map((c) => (
          <Chip key={c} label={c} tone={selected.has(c) ? "primary" : "neutral"} onPress={() => toggle(c)} />
        ))}
      </View>
      <Button onPress={() => saveOnboardingStep("interests", { cultures: Array.from(selected) }, "/onboarding/interests")}>
        {t("continue")}
      </Button>
      <Button variant="ghost" onPress={() => saveOnboardingStep("interests", { cultures: [] }, "/onboarding/interests")}>
        {t("skip")}
      </Button>
    </Screen>
  );
}
