import NetInfo from "@react-native-community/netinfo";
import React from "react";
import { Text } from "react-native";
import { useTranslation } from "react-i18next";
import { colors } from "@/theme";

export function OfflineBanner() {
  const { t } = useTranslation();
  const [online, setOnline] = React.useState(true);
  React.useEffect(() => NetInfo.addEventListener((state) => setOnline(Boolean(state.isConnected))), []);
  if (online) return null;
  return <Text style={{ backgroundColor: colors.warning, color: colors.dark, padding: 10, textAlign: "center", fontWeight: "700" }}>{t("noInternet")}</Text>;
}
