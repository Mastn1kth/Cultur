import React from "react";
import { Link } from "expo-router";
import { Body, Button, Card, Chip, EmptyState, Row, Screen, ScreenHeader, TagRow } from "@/components/ui";
import { api } from "@/lib/client";

type CurrentProfile = {
  name?: string | null;
  age?: number | null;
  city?: string | null;
  bio?: string | null;
  goal?: string | null;
  languages?: string[] | null;
  cultures?: string[] | null;
  interests?: string[] | null;
  religion_visibility?: string | null;
  politics_visibility?: string | null;
  onboarding_step?: string | null;
};

function profileTags(profile: CurrentProfile) {
  return [...(profile.languages ?? []), ...(profile.cultures ?? []), ...(profile.interests ?? [])].slice(0, 6);
}

export default function MyProfileScreen() {
  const [profile, setProfile] = React.useState<CurrentProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const loadProfile = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<CurrentProfile | null>("/users/me");
      setProfile(response.data);
    } catch {
      setError("Could not load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadProfile().catch(() => undefined);
  }, [loadProfile]);

  const tags = profile ? profileTags(profile) : [];

  return (
    <Screen>
      <ScreenHeader title="My profile" subtitle="Backend-backed profile and onboarding state." />
      {loading ? <EmptyState title="Loading profile..." /> : null}
      {error ? (
        <Card>
          <Body>{error}</Body>
          <Button variant="ghost" onPress={loadProfile}>Retry</Button>
        </Card>
      ) : null}
      {!loading && !error && profile ? (
        <Card>
          <Row>
            {profile.name && profile.age ? <Body strong>{profile.name}, {profile.age}</Body> : <Body strong>Profile is not filled in yet</Body>}
            {profile.onboarding_step ? <Chip label={profile.onboarding_step} tone={profile.onboarding_step === "complete" ? "success" : "warning"} /> : null}
          </Row>
          {profile.city ? <Body muted>{profile.city}</Body> : null}
          {profile.bio ? <Body muted>{profile.bio}</Body> : null}
          {tags.length ? <TagRow tags={tags} /> : null}
          {profile.goal ? <Body muted>Goal: {profile.goal}</Body> : null}
          {profile.religion_visibility ? <Body muted>Religion visibility: {profile.religion_visibility}</Body> : null}
          {profile.politics_visibility ? <Body muted>Politics visibility: {profile.politics_visibility}</Body> : null}
        </Card>
      ) : null}
      <Link href="/profile/edit" asChild><Button>Edit profile</Button></Link>
      <Link href="/profile/culture-cards" asChild><Button variant="ghost">Culture cards</Button></Link>
      <Link href="/privacy" asChild><Button variant="ghost">Privacy Center</Button></Link>
      <Link href="/settings" asChild><Button variant="ghost">Settings</Button></Link>
    </Screen>
  );
}
