import React from "react";
import { useLocalSearchParams } from "expo-router";
import { Body, Button, Card, EmptyState, H1, PersonCard, Screen, TagRow } from "@/components/ui";
import { api } from "@/lib/client";

type ProfileResponse = {
  user_id?: string;
  name?: string | null;
  age?: number | null;
  bio?: string | null;
  city?: string | null;
  languages?: string[];
  cultures?: string[];
  interests?: string[];
  family_values?: string | null;
  i_can_teach?: string | null;
  i_miss_from_home?: string | null;
  favorite_tradition?: string | null;
  looking_for?: string | null;
  profile_complete_pct?: number | null;
  photo_url?: string | null;
  thumbnail_url?: string | null;
};

function profileTags(profile: ProfileResponse) {
  return [...(profile.languages ?? []), ...(profile.cultures ?? []), ...(profile.interests ?? [])].slice(0, 5);
}

function cultureReasons(profile: ProfileResponse) {
  return [
    profile.family_values ? `Family values: ${profile.family_values}` : null,
    profile.i_can_teach ? `Can teach: ${profile.i_can_teach}` : null,
    profile.i_miss_from_home ? `Misses from home: ${profile.i_miss_from_home}` : null,
    profile.favorite_tradition ? `Favorite tradition: ${profile.favorite_tradition}` : null,
    profile.looking_for ? `Looking for: ${profile.looking_for}` : null
  ].filter(Boolean) as string[];
}

export default function PersonProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const [profile, setProfile] = React.useState<ProfileResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      const path = userId ? `/users/${userId}/profile` : "/users/me";
      const response = await api.get<ProfileResponse | null>(path);
      if (mounted) setProfile(response.data);
    })().catch(() => {
      if (mounted) setError("Could not load profile");
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [userId]);

  if (loading) return <Screen><EmptyState title="Loading profile..." /></Screen>;
  if (error) return <Screen><EmptyState title={error} /></Screen>;
  if (!profile?.name || !profile.age) return <Screen><EmptyState title="Profile is not available" /></Screen>;

  const reasons = cultureReasons(profile);
  const photo = profile.thumbnail_url ?? profile.photo_url;

  return (
    <Screen>
      {photo ? (
        <PersonCard person={{
          name: profile.name,
          age: profile.age,
          city: profile.city ?? "Nearby",
          photo,
          tags: profileTags(profile),
          score: profile.profile_complete_pct ?? 0,
          reasons: reasons.length ? reasons : [profile.bio ?? "Culture details are not filled in yet."]
        }} />
      ) : (
        <Card>
          <H1>{profile.name}, {profile.age}</H1>
          {profile.city ? <Body muted>{profile.city}</Body> : null}
          <TagRow tags={profileTags(profile)} />
          {profile.bio ? <Body>{profile.bio}</Body> : null}
        </Card>
      )}
      <Card>
        <H1>Culture Cards</H1>
        <Body>{reasons.length ? reasons.join(" / ") : "No culture cards yet"}</Body>
      </Card>
      <Button>Send icebreaker</Button>
    </Screen>
  );
}
