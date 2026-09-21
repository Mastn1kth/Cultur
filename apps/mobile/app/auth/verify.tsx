import React from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Body, H1, Screen } from "@/components/ui";
import { api, getDeviceId, saveSession } from "@/lib/client";
import { registerPushToken } from "@/lib/notifications";
import { getOnboardingResumePath } from "@/lib/onboarding";

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  userId: string;
};

export default function VerifyMagicLinkScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [message, setMessage] = React.useState("Verifying your link...");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setMessage("Invalid link");
        return;
      }
      const deviceId = await getDeviceId();
      const response = await api.post<AuthResponse>("/auth/verify", { token, deviceId });
      await saveSession(response.data.accessToken, response.data.refreshToken, response.data.userId);
      registerPushToken().catch(() => undefined);
      if (cancelled) return;
      router.replace(await getOnboardingResumePath());
    })().catch((error) => {
      if (!cancelled) setMessage(error instanceof Error ? error.message : "Could not verify link");
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <Screen>
      <H1>Session recovery</H1>
      <Body muted>{message}</Body>
    </Screen>
  );
}
