import "react-native-gesture-handler";
import "@/i18n";
import { Stack } from "expo-router";
import { OfflineBanner } from "@/components/offline-banner";
import { AuthProvider } from "@/providers/AuthProvider";
import { colors } from "@/theme";

export default function RootLayout() {
  return (
    <AuthProvider>
      <OfflineBanner />
      <Stack screenOptions={{ headerLargeTitle: false, headerShadowVisible: false, headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth/sign-in" options={{ title: "Sign in" }} />
        <Stack.Screen name="auth/magic-link-sent" options={{ title: "Check email" }} />
        <Stack.Screen name="auth/magic-link-verify" options={{ title: "Verifying" }} />
        <Stack.Screen name="auth/verify" options={{ title: "Verifying" }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="match" options={{ presentation: "modal", title: "Match" }} />
        <Stack.Screen name="filters" options={{ presentation: "modal", title: "Filters" }} />
        <Stack.Screen name="search" options={{ title: "Search" }} />
        <Stack.Screen name="safety" options={{ title: "Safety Center" }} />
        <Stack.Screen name="privacy" options={{ title: "Privacy Center" }} />
        <Stack.Screen name="report" options={{ title: "Report" }} />
        <Stack.Screen name="blocked-users" options={{ title: "Blocked Users" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
        <Stack.Screen name="settings/notifications" options={{ title: "Notifications" }} />
        <Stack.Screen name="settings/privacy" options={{ title: "Privacy Settings" }} />
        <Stack.Screen name="settings/language" options={{ title: "Language" }} />
        <Stack.Screen name="settings/delete-account" options={{ title: "Delete Account" }} />
        <Stack.Screen name="profile/edit" options={{ title: "Edit Profile" }} />
        <Stack.Screen name="profile/person" options={{ title: "Profile" }} />
        <Stack.Screen name="profile/culture-cards" options={{ title: "Culture Cards" }} />
      </Stack>
    </AuthProvider>
  );
}
