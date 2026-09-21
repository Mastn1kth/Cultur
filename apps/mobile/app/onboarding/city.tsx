import React from "react";
import { Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { Body, Button, H1, Screen, Field } from "@/components/ui";
import { saveOnboardingStep } from "@/lib/onboarding";

const CITIES = [
  { name: "Chicago", country: "US", lat: 41.8781, lng: -87.6298 },
  { name: "New York", country: "US", lat: 40.7128, lng: -74.0060 },
  { name: "Toronto", country: "CA", lat: 43.6532, lng: -79.3832 },
  { name: "Berlin", country: "DE", lat: 52.5200, lng: 13.4050 },
  { name: "London", country: "GB", lat: 51.5074, lng: -0.1278 },
  { name: "Tashkent", country: "UZ", lat: 41.2995, lng: 69.2401 },
  { name: "Istanbul", country: "TR", lat: 41.0082, lng: 28.9784 },
  { name: "Moscow", country: "RU", lat: 55.7558, lng: 37.6173 },
];

export default function OnboardingCity() {
  const { t } = useTranslation();
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<typeof CITIES[number] | null>(null);

  const filtered = query
    ? CITIES.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : [];

  return (
    <Screen>
      <Body muted>2 / 7</Body>
      <H1>{t("cityStep")}</H1>
      <Field placeholder={t("cityPlaceholder")} value={query} onChangeText={setQuery} />
      {filtered.map((c) => (
        <Pressable key={c.name} onPress={() => { setSelected(c); setQuery(c.name); }}>
          <Body strong={selected?.name === c.name}>{c.name}, {c.country}</Body>
        </Pressable>
      ))}
      <Button
        disabled={!selected}
        onPress={() => {
          if (!selected) return;
          saveOnboardingStep("languages", {
            city: selected.name,
            country: selected.country,
            latitude: selected.lat,
            longitude: selected.lng,
          }, "/onboarding/languages");
        }}
      >
        {t("continue")}
      </Button>
    </Screen>
  );
}
