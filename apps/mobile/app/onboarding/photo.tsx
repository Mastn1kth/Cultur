import { useTranslation } from "react-i18next";
import { Body, Button, Card, H1, Screen } from "@/components/ui";
import { PhotoUploader } from "@/components/PhotoUploader";
import { saveOnboardingStep } from "@/lib/onboarding";

export default function OnboardingPhoto() {
  const { t } = useTranslation();
  return (
    <Screen>
      <Body muted>6 / 7</Body>
      <H1>{t("photoStep")}</H1>
      <Card><Body>{t("photoHint")}</Body><Body muted>{t("photoLimit")}</Body></Card>
      <PhotoUploader onUploaded={() => saveOnboardingStep("complete", {}, "/onboarding/complete")} />
      <Button variant="ghost" onPress={() => saveOnboardingStep("complete", {}, "/onboarding/complete")}>{t("skip")}</Button>
    </Screen>
  );
}
