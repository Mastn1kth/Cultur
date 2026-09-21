import React from "react";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Body, Button, Card, EmptyState, H1, PersonCard, Screen, TagRow } from "@/components/ui";
import { api } from "@/lib/client";
import { clearOnboardingStep } from "@/lib/onboarding";

type CurrentProfile = {
  name?: string | null;
  age?: number | null;
  city?: string | null;
  bio?: string | null;
  languages?: string[];
  cultures?: string[];
  interests?: string[];
  profile_complete_pct?: number | null;
  photo_url?: string | null;
  thumbnail_url?: string | null;
};

function profileTags(profile: CurrentProfile) {
  return [...(profile.languages ?? []), ...(profile.cultures ?? []), ...(profile.interests ?? [])].slice(0, 5);
}

export default function OnboardingComplete() {
  const { t } = useTranslation();
  const [profile, setProfile] = React.useState<CurrentProfile | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    api.get<CurrentProfile | null>("/users/me")
      .then((response) => {
        if (mounted) setProfile(response.data);
      })
      .catch(() => undefined)
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function startDiscovery() {
    await clearOnboardingStep();
    router.replace("/(tabs)/discover");
  }

  const photo = profile?.thumbnail_url ?? profile?.photo_url;
  const canRenderCard = profile?.name && profile.age && photo;

  return (
    <Screen>
      <Body muted>7 / 7</Body>
      <H1>{t("completeStep")}</H1>
      {loading ? <EmptyState title={t("loading")} /> : null}
      {!loading && canRenderCard ? (
        <PersonCard person={{
          name: profile.name!,
          age: profile.age!,
          city: profile.city ?? t("distanceNearby"),
          photo,
          tags: profileTags(profile),
          score: profile.profile_complete_pct ?? 0,
          reasons: profile.bio ? [profile.bio] : ["Your profile is ready for discovery."]
        }} />
      ) : null}
      {!loading && !canRenderCard ? (
        <Card>
          <Body>Your profile is ready enough to start discovery.</Body>
          {profile ? <TagRow tags={profileTags(profile)} /> : null}
        </Card>
      ) : null}
      <Button onPress={startDiscovery}>{t("startDiscovery")}</Button>
    </Screen>
  );
}
