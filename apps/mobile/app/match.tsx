import { Link } from "expo-router";
import { Body, Button, Card, H1, Screen } from "@/components/ui";

export default function MatchScreen() {
  return (
    <Screen>
      <H1>It's a match</H1>
      <Card>
        <Body>You both speak Russian.</Body>
        <Body>Both looking for friends.</Body>
        <Body>Try a cultural icebreaker to start softer.</Body>
      </Card>
      <Link href="/(tabs)/chats" asChild><Button>Open chat</Button></Link>
    </Screen>
  );
}
