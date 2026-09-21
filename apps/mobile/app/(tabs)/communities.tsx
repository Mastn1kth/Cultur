import React from "react";
import { Link } from "expo-router";
import { Body, Button, Card, Chip, EmptyState, Row, Screen, ScreenHeader, TagRow } from "@/components/ui";
import { api } from "@/lib/client";

type CommunityItem = {
  id: string;
  name: string;
  city: string;
  languages?: string[];
  cultures?: string[];
  interests?: string[];
  members_count?: number;
  max_members?: number | null;
};

type CommunitiesResponse = {
  items: CommunityItem[];
};

function communityTags(community: CommunityItem) {
  return [...(community.languages ?? []), ...(community.cultures ?? []), ...(community.interests ?? [])].slice(0, 5);
}

export default function CommunitiesListScreen() {
  const [communities, setCommunities] = React.useState<CommunityItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const loadCommunities = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<CommunitiesResponse>("/communities");
      setCommunities(response.data.items);
    } catch {
      setError("Could not load small circles");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadCommunities().catch(() => undefined);
  }, [loadCommunities]);

  return (
    <Screen>
      <ScreenHeader title="Small Circles" subtitle="Small groups for practical help, culture, and friendship." />
      {loading ? <EmptyState title="Loading small circles..." /> : null}
      {error ? (
        <Card>
          <Body>{error}</Body>
          <Button variant="ghost" onPress={loadCommunities}>Retry</Button>
        </Card>
      ) : null}
      {!loading && !error && communities.length === 0 ? <EmptyState title="No small circles yet" /> : null}
      {communities.map((community) => (
        <Link key={community.id} href={`/community/${community.id}`} asChild>
          <Card>
            <Row>
              <Body strong>{community.name}</Body>
              <Chip label={`${community.members_count ?? 0}/${community.max_members ?? 20}`} tone="primary" />
            </Row>
            <Body muted>{community.city}</Body>
            <TagRow tags={communityTags(community)} />
          </Card>
        </Link>
      ))}
    </Screen>
  );
}
