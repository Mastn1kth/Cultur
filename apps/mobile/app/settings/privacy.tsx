import React from "react";
import { useTranslation } from "react-i18next";
import { Body, Card, Chip, H1, Screen } from "@/components/ui";
import { api } from "@/lib/client";
import { View } from "react-native";

export default function PrivacySettingsScreen() {
  const { t } = useTranslation();
  const [privacy, setPrivacy] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    api.get("/privacy/center").then((r) => setPrivacy(r.data ?? {})).catch(() => {});
  }, []);

  return (
    <Screen>
      <H1>{t("privacy")}</H1>
      <Card>
        <Body strong>Collected data</Body>
        <Body muted>{(privacy as any)?.collected?.join(", ") ?? "Email, profile info, location"}</Body>
      </Card>
      <Card>
        <Body strong>Location</Body>
        <Body muted>{(privacy as any)?.locationPolicy ?? "Only approximate distance is shown"}</Body>
      </Card>
      <Card>
        <Body strong>Data deletion</Body>
        <Body muted>{(privacy as any)?.deletion ?? "Soft delete, anonymized after 30 days"}</Body>
      </Card>
    </Screen>
  );
}
