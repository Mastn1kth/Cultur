import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { colors } from "@/theme";

export default function TabLayout() {
  const { t } = useTranslation();
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border }, headerShown: false }}>
      <Tabs.Screen name="discover" options={{ tabBarLabel: t("discover"), tabBarIcon: ({ color }) => <TabIcon name="compass" color={color} /> }} />
      <Tabs.Screen name="chats" options={{ tabBarLabel: t("chats"), tabBarIcon: ({ color }) => <TabIcon name="chatbubble" color={color} /> }} />
      <Tabs.Screen name="events" options={{ tabBarLabel: t("events"), tabBarIcon: ({ color }) => <TabIcon name="calendar" color={color} /> }} />
      <Tabs.Screen name="communities" options={{ tabBarLabel: t("circles"), tabBarIcon: ({ color }) => <TabIcon name="people" color={color} /> }} />
      <Tabs.Screen name="profile" options={{ tabBarLabel: t("profile"), tabBarIcon: ({ color }) => <TabIcon name="person" color={color} /> }} />
    </Tabs>
  );
}

import { Text } from "react-native";

function TabIcon({ name, color }: { name: string; color: string }) {
  const icons: Record<string, string> = {
    compass: "\u{1F9ED}",
    chatbubble: "\u{1F4AC}",
    calendar: "\u{1F4C5}",
    people: "\u{1F465}",
    person: "\u{1F464}",
  };
  return <Text style={{ fontSize: 22, color }}>{icons[name] ?? "\u{25CF}"}</Text>;
}
