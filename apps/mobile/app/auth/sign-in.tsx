import React from "react";
import { Link, router } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useTranslation } from "react-i18next";
import { api, apiFetch, getDeviceId, saveSession } from "@/api/client";
import { registerPushToken } from "@/lib/notifications";
import { getOnboardingResumePath } from "@/lib/onboarding";
import { Body, Button, Card, Field, H1, Screen } from "@/components/ui";

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  userId: string;
};

export default function SignInScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState("");
  const [appleAvailable, setAppleAvailable] = React.useState(false);

  React.useEffect(() => {
    GoogleSignin.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "" });
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => setAppleAvailable(false));
  }, []);

  async function finishAuth(response: AuthResponse) {
    await saveSession(response.accessToken, response.refreshToken, response.userId);
    registerPushToken().catch(() => undefined);
    router.replace(await getOnboardingResumePath());
  }

  async function startMagic() {
    try {
      await apiFetch("/auth/magic/start", { method: "POST", body: JSON.stringify({ email }) });
      router.push("/auth/magic-link-sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Server is unavailable. Please try later");
    }
  }

  async function continueWithGoogle() {
    try {
      setError("");
      const deviceId = await getDeviceId();
      const signIn = await GoogleSignin.signIn();
      if (signIn.type !== "success") return;
      const { idToken } = signIn.data;
      if (!idToken) throw new Error("Google did not return an idToken");
      const response = await api.post<AuthResponse>("/auth/google", { token: idToken, deviceId });
      await finishAuth(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    }
  }

  async function continueWithApple() {
    try {
      setError("");
      const deviceId = await getDeviceId();
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL
        ]
      });
      if (!credential.identityToken) throw new Error("Apple did not return an identityToken");
      const response = await api.post<AuthResponse>("/auth/apple", { identityToken: credential.identityToken, deviceId });
      await finishAuth(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Apple sign-in failed");
    }
  }

  return (
    <Screen>
      <H1>{t("signInTitle")}</H1>
      <Card>
        <Field placeholder={t("emailPlaceholder")} value={email} onChangeText={setEmail} />
        {error ? <Body>{error}</Body> : <Body muted>{t("signInSubtitle")}</Body>}
      </Card>
      <Button onPress={startMagic}>{t("sendMagicLink")}</Button>
      {appleAvailable ? <Button variant="ghost" onPress={continueWithApple}>{t("appleSignIn")}</Button> : null}
      <Button variant="ghost" onPress={continueWithGoogle}>{t("googleSignIn")}</Button>
      <Link href="/onboarding/welcome" asChild><Button variant="ghost">{t("onboardingPreview")}</Button></Link>
    </Screen>
  );
}
