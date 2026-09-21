import { Link, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Body, Button, Card, H1, Screen } from "@/components/ui";
import { getOnboardingResumePath } from "@/lib/onboarding";

export default function SplashScreen() {
  const { t } = useTranslation();
  async function continueOnboarding() {
    router.push(await getOnboardingResumePath());
  }

  return (
    <Screen>
      <H1>{t("appName")}</H1>
      <Body muted>{t("tagline")}</Body>
      <Card>
        <Body>{t("featureSummary")}</Body>
      </Card>
      <Link href="/auth/sign-in" asChild><Button>{t("signIn")}</Button></Link>
      <Button variant="ghost" onPress={continueOnboarding}>{t("onboardingPreview")}</Button>
    </Screen>
  );
}
