import React from "react";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Body, Button, Card, H1, Screen } from "@/components/ui";
import { api, clearSession } from "@/lib/client";

export default function DeleteAccountScreen() {
  const { t } = useTranslation();
  const [confirming, setConfirming] = React.useState(false);

  async function handleDelete() {
    await api.delete("/users/me");
    await clearSession();
    router.replace("/auth/sign-in");
  }

  return (
    <Screen>
      <H1>{t("deleteAccount")}</H1>
      <Card tone="warning">
        <Body>{t("deleteConfirm")}</Body>
        <Body muted>{t("deleteWarning")}</Body>
      </Card>
      {confirming ? (
        <Button variant="secondary" onPress={handleDelete}>{t("confirm")}</Button>
      ) : (
        <Button variant="secondary" onPress={() => setConfirming(true)}>{t("deleteAccount")}</Button>
      )}
      {confirming ? <Button variant="ghost" onPress={() => setConfirming(false)}>{t("cancel")}</Button> : null}
    </Screen>
  );
}
