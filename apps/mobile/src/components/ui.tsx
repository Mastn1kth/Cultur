import React from "react";
import { Pressable, ScrollView, Text, TextInput, View, type PressableProps } from "react-native";
import { Image } from "expo-image";
import { colors, radii } from "@/theme";

export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 18, paddingBottom: 32, gap: 16 }}>
      {children}
    </ScrollView>
  );
}

export function ScreenHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text selectable style={{ fontSize: 12, lineHeight: 16, fontWeight: "800", color: colors.primary, textTransform: "uppercase", letterSpacing: 0 }}>CultureMatch</Text>
          <H1>{title}</H1>
        </View>
        {action}
      </View>
      {subtitle ? <Body muted>{subtitle}</Body> : null}
    </View>
  );
}

export function H1({ children }: { children: React.ReactNode }) {
  return <Text selectable style={{ fontSize: 30, lineHeight: 36, fontWeight: "800", color: colors.text, letterSpacing: 0 }}>{children}</Text>;
}

export function H2({ children }: { children: React.ReactNode }) {
  return <Text selectable style={{ fontSize: 21, lineHeight: 27, fontWeight: "800", color: colors.text, letterSpacing: 0 }}>{children}</Text>;
}

export function Body({ children, muted = false, strong = false }: { children: React.ReactNode; muted?: boolean; strong?: boolean }) {
  return <Text selectable style={{ fontSize: 16, lineHeight: 23, color: muted ? colors.muted : colors.text, fontWeight: strong ? "700" : "400" }}>{children}</Text>;
}

export function Button({ children, variant = "primary", ...props }: PressableProps & { children: React.ReactNode; variant?: "primary" | "secondary" | "ghost" }) {
  const bg = variant === "primary" ? colors.primary : variant === "secondary" ? colors.secondary : colors.surface;
  const fg = variant === "ghost" ? colors.text : colors.white;
  return (
    <Pressable accessibilityRole="button" {...props} style={({ pressed }) => [{ minHeight: 46, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, backgroundColor: bg, opacity: pressed || props.disabled ? 0.68 : 1, borderWidth: variant === "ghost" ? 1 : 0, borderColor: colors.border }, props.style as object]}>
      <Text selectable style={{ color: fg, fontWeight: "800", fontSize: 16, letterSpacing: 0 }}>{children}</Text>
    </Pressable>
  );
}

export function Card({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "soft" | "accent" }) {
  const backgroundColor = tone === "soft" ? colors.surfaceMuted : tone === "accent" ? colors.primarySoft : colors.surface;
  return <View style={{ backgroundColor, borderRadius: radii.card, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.border }}>{children}</View>;
}

export function Row({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>{children}</View>;
}

export function Chip({ label, tone = "primary", onPress }: { label: string; tone?: "primary" | "secondary" | "neutral" | "success" | "warning"; onPress?: () => void }) {
  const bg = tone === "primary" ? colors.primarySoft : tone === "secondary" ? colors.secondarySoft : tone === "success" ? colors.successSoft : tone === "warning" ? colors.warningSoft : colors.surfaceMuted;
  const fg = tone === "primary" ? colors.primary : tone === "secondary" ? colors.secondary : tone === "success" ? colors.success : tone === "warning" ? colors.warning : colors.dark;
  const inner = <Text selectable style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.chip, backgroundColor: bg, color: fg, fontSize: 13, lineHeight: 16, fontWeight: "800", overflow: "hidden" }}>{label}</Text>;
  if (onPress) return <Pressable onPress={onPress}>{inner}</Pressable>;
  return inner;
}

export function TagRow({ tags }: { tags: string[] }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{tags.map((tag, index) => <Chip key={`${tag}-${index}`} label={tag} tone={index % 3 === 0 ? "primary" : index % 3 === 1 ? "secondary" : "neutral"} />)}</View>;
}

export function PersonCard({ person }: { person: { name: string; age: number; city: string; photo: string; tags: string[]; score: number; reasons: string[] } }) {
  return (
    <Card>
      <Image source={{ uri: person.photo }} style={{ width: "100%", aspectRatio: 1.05, borderRadius: 8, backgroundColor: colors.border }} contentFit="cover" />
      <H2>{person.name}, {person.age}</H2>
      <Body muted>{person.city}</Body>
      <TagRow tags={person.tags} />
      <View style={{ gap: 6 }}>
        <Text selectable style={{ fontSize: 18, fontWeight: "800", color: colors.primary }}>{person.score}% compatible</Text>
        {person.reasons.map((reason) => <Body key={reason} muted>{reason}</Body>)}
      </View>
    </Card>
  );
}

export function EmptyState({ title, action }: { title: string; action?: string }) {
  return (
    <Card tone="soft">
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", alignSelf: "center" }}>
        <Text selectable style={{ color: colors.primary, fontWeight: "900" }}>CM</Text>
      </View>
      <Body>{title}</Body>
      {action ? <Button variant="ghost">{action}</Button> : null}
    </Card>
  );
}

export function Field({ placeholder, value, onChangeText }: { placeholder: string; value: string; onChangeText: (value: string) => void }) {
  return <TextInput accessibilityLabel={placeholder} placeholder={placeholder} placeholderTextColor={colors.muted} value={value} onChangeText={onChangeText} style={{ minHeight: 50, backgroundColor: colors.surface, borderRadius: radii.input, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border, fontSize: 16, color: colors.text }} />;
}
