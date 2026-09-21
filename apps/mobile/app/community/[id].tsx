import React from "react";
import { Link, useLocalSearchParams } from "expo-router";
import { Body, Button, Card, Chip, EmptyState, Row, Screen, ScreenHeader, TagRow } from "@/components/ui";
import { api } from "@/lib/client";

type CommunityDetail = {
  id: string;
  name: string;
  description?: string | null;
  city: string;
  languages?: string[] | null;
  cultures?: string[] | null;
  interests?: string[] | null;
  members_count?: number | null;
  max_members?: number | null;
  is_member?: boolean;
  my_role?: "admin" | "member" | null;
};

function communityTags(community: CommunityDetail) {
  return [...(community.languages ?? []), ...(community.cultures ?? []), ...(community.interests ?? [])].slice(0, 6);
}

export default function CommunityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const communityId = String(id);
  const [community, setCommunity] = React.useState<CommunityDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  const loadCommunity = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<CommunityDetail | null>(`/communities/${communityId}`);
      setCommunity(response.data);
    } catch {
      setError("Could not load small circle");
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  React.useEffect(() => {
    loadCommunity().catch(() => undefined);
  }, [loadCommunity]);

  async function updateMembership(action: "join" | "leave") {
    setSaving(true);
    setError("");
    try {
      await api.post(`/communities/${communityId}/${action}`);
      await loadCommunity();
    } catch {
      setError("Could not update membership");
    } finally {
      setSaving(false);
    }
  }

  const tags = community ? communityTags(community) : [];

  return (
    <Screen>
      {loading ? <EmptyState title="Loading small circle..." /> : null}
      {error ? (
        <Card>
          <Body>{error}</Body>
          <Button variant="ghost" onPress={loadCommunity}>Retry</Button>
        </Card>
      ) : null}
      {!loading && !error && !community ? <EmptyState title="Small circle is not available" /> : null}
      {community ? (
        <>
          <ScreenHeader title={community.name} subtitle={community.city} />
          <Card>
            <Row>
              <Chip label={`${community.members_count ?? 0}/${community.max_members ?? 20} members`} tone="primary" />
              {community.my_role ? <Chip label={community.my_role} tone="success" /> : <Chip label="visitor" tone="neutral" />}
            </Row>
            {community.description ? <Body>{community.description}</Body> : null}
            {tags.length ? <TagRow tags={tags} /> : null}
          </Card>
          {community.is_member ? (
            <Button variant="ghost" onPress={() => updateMembership("leave")} disabled={saving}>Leave</Button>
          ) : (
            <Button onPress={() => updateMembership("join")} disabled={saving}>Join</Button>
          )}
          <Link href={`/community/chat?id=${community.id}`} asChild><Button variant="ghost">Open group chat</Button></Link>
        </>
      ) : null}
    </Screen>
  );
}
