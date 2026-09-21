import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button, H1, Screen } from "@/components/ui";
import { api } from "@/lib/client";
import { clearSession } from "@/lib/client";
import { router } from "expo-router";

export default function SettingsScreen() {
  const { t } = useTranslation();

  async function handleLogout() {
    try { await api.post("/auth/logout"); } catch {}
    await clearSession();
    router.replace("/auth/sign-in");
  }

  return (
    <Screen>
      <H1>{t("settings")}</H1>
      <Link href="/settings/notifications" asChild><Button variant="ghost">{t("notifications")}</Button></Link>
      <Link href="/settings/privacy" asChild><Button variant="ghost">{t("privacy")}</Button></Link>
      <Link href="/settings/language" asChild><Button variant="ghost">{t("language")}</Button></Link>
      <Link href="/settings/delete-account" asChild><Button variant="ghost">{t("deleteAccount")}</Button></Link>
      <Link href="/privacy" asChild><Button variant="ghost">{t("about")}</Button></Link>
      <Button variant="secondary" onPress={handleLogout}>{t("logout")}</Button>
    </Screen>
  );
}
