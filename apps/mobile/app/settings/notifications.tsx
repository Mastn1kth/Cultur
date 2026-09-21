import React from "react";
import { useTranslation } from "react-i18next";
import { Body, Button, Card, H1, Row, Screen } from "@/components/ui";
import { api } from "@/lib/client";

const TOGGLES = [
  { key: "newMatch", label: "New match" },
  { key: "newMessage", label: "New message" },
  { key: "icebreakers", label: "Icebreaker suggestions" },
  { key: "nearbyEvents", label: "Nearby events" },
  { key: "profileLikes", label: "Profile likes" },
  { key: "communities", label: "Community activity" },
];

export default function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const [settings, setSettings] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    api.get<Record<string, boolean>>("/notifications/settings").then((r) => setSettings(r.data)).catch(() => {});
  }, []);

  async function toggle(key: string) {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    try { await api.patch("/notifications/settings", next); } catch { setSettings(settings); }
  }

  return (
    <Screen>
      <H1>{t("notifications")}</H1>
      {TOGGLES.map((item) => (
        <Card key={item.key}>
          <Row>
            <Body>{item.label}</Body>
            <Button variant="ghost" onPress={() => toggle(item.key)}>
              {settings[item.key] !== false ? "ON" : "OFF"}
            </Button>
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
