import * as Notifications from "expo-notifications";
import { api } from "@/lib/client";

export async function registerPushToken() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return;
  const token = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID
  });
  await api.post("/notifications/push-token", { token: token.data });
}
