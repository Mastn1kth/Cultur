import { Link } from "expo-router";
import { useTranslation } from "react-i18next";
import { Body, Button, H1, Screen } from "@/components/ui";

export default function MagicLinkSentScreen() {
  const { t } = useTranslation();
  return <Screen><H1>{t("magicLinkSent")}</H1><Body muted>The dev API returns a test link in the response while SMTP is not configured.</Body><Link href="/auth/magic-link-verify" asChild><Button>Verify manually</Button></Link></Screen>;
}
