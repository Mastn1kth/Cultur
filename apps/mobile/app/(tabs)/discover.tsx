import React from "react";
import { Link, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { PanGestureHandler, type PanGestureHandlerGestureEvent } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedGestureHandler, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { Button, EmptyState, H1, PersonCard, Screen } from "@/components/ui";
import { api } from "@/lib/client";

type DiscoveryProfile = {
  user_id: string;
  name: string;
  age: number;
  city: string;
  cultures?: string[];
  languages?: string[];
  interests?: string[];
  photo_url?: string | null;
  distanceLabel?: string;
  compatibility?: {
    score: number;
    reasons: string[];
  };
};

type DiscoveryResponse = {
  items: DiscoveryProfile[];
  nextCursor: string | null;
};

function SwipeCard({ profile, onSwipe }: { profile: DiscoveryProfile; onSwipe: (action: "like" | "skip") => void }) {
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const gesture = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onActive: (event) => {
      translateX.value = event.translationX;
      rotate.value = event.translationX / 18;
    },
    onEnd: (event) => {
      if (event.translationX > 110) {
        translateX.value = withSpring(420);
        runOnJS(onSwipe)("like");
        return;
      }
      if (event.translationX < -110) {
        translateX.value = withSpring(-420);
        runOnJS(onSwipe)("skip");
        return;
      }
      translateX.value = withSpring(0);
      rotate.value = withSpring(0);
    }
  });
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` }
    ]
  }));
  const tags = [...(profile.languages ?? []), ...(profile.cultures ?? []), ...(profile.interests ?? [])].slice(0, 4);
  return (
    <PanGestureHandler onGestureEvent={gesture}>
      <Animated.View style={style}>
        <PersonCard person={{
          name: profile.name,
          age: profile.age,
          city: profile.distanceLabel ?? profile.city,
          photo: profile.photo_url ?? "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=900",
          tags,
          score: profile.compatibility?.score ?? 0,
          reasons: profile.compatibility?.reasons ?? []
        }} />
      </Animated.View>
    </PanGestureHandler>
  );
}

export default function DiscoverScreen() {
  const { t } = useTranslation();
  const [profiles, setProfiles] = React.useState<DiscoveryProfile[]>([]);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const loadingRef = React.useRef(false);

  const loadProfiles = React.useCallback(async (nextCursor: string | null) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const response = await api.get<DiscoveryResponse>("/discovery", { params: { cursor: nextCursor, limit: 10 } });
      setProfiles((current) => nextCursor ? [...current, ...response.data.items] : response.data.items);
      setCursor(response.data.nextCursor);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadProfiles(null).catch(() => undefined);
  }, [loadProfiles]);

  React.useEffect(() => {
    if (profiles.length <= 2 && cursor) {
      loadProfiles(cursor).catch(() => undefined);
    }
  }, [cursor, loadProfiles, profiles.length]);

  async function swipe(profile: DiscoveryProfile, action: "like" | "skip") {
    setProfiles((current) => current.filter((item) => item.user_id !== profile.user_id));
    try {
      const response = await api.post<{ matched: boolean; match?: { id: string } }>("/matching/swipes", {
        swiped_id: profile.user_id,
        action
      });
      if (response.data.matched) router.push("/match");
    } catch {
      setProfiles((current) => [profile, ...current]);
    }
  }

  const top = profiles[0];
  return (
    <Screen>
      <H1>{t("discover")}</H1>
      {top ? <SwipeCard profile={top} onSwipe={(action) => swipe(top, action)} /> : <EmptyState title={loading ? t("loading") : t("noOneNearby")} />}
      {top ? <Button variant="secondary" onPress={() => swipe(top, "like")}>Like</Button> : null}
      {top ? <Button variant="ghost" onPress={() => swipe(top, "skip")}>Skip</Button> : null}
      <Link href="/filters" asChild><Button variant="ghost">Filters</Button></Link>
    </Screen>
  );
}
