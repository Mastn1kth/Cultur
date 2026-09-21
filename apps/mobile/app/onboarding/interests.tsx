import React from "react";
import { useTranslation } from "react-i18next";
import { Body, Button, Chip, H1, Screen } from "@/components/ui";
import { saveOnboardingStep } from "@/lib/onboarding";
import { View } from "react-native";

const INTERESTS = ["cooking", "music", "books", "martial arts", "language exchange", "hiking", "photography", "dancing", "sports", "art", "travel", "technology"];

export default function OnboardingInterests() {
  const { t } = useTranslation();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  function toggle(i: string) {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setSelected(next);
  }

  return (
    <Screen>
      <Body muted>5 / 7</Body>
      <H1>{t("interestsStep")}</H1>
      <Body muted>{t("interestsLabel")}</Body>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 16 }}>
        {INTERESTS.map((i) => (
          <Chip key={i} label={i} tone={selected.has(i) ? "primary" : "neutral"} onPress={() => toggle(i)} />
        ))}
      </View>
      <Button
        disabled={selected.size < 3}
        onPress={() => saveOnboardingStep("photo", { interests: Array.from(selected) }, "/onboarding/photo")}
      >
        {t("continue")}
      </Button>
    </Screen>
  );
}
