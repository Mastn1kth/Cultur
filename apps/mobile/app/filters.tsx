import { Body, Button, Card, H1, Screen, TagRow } from "@/components/ui";

export default function FiltersScreen() {
  return (
    <Screen>
      <H1>Filters</H1>
      <Card><Body>Distance: 50 km</Body><Body muted>People 700+ km away are never shown when radius is 50 km.</Body></Card>
      <Card><Body>Languages</Body><TagRow tags={["Russian", "English"]} /></Card>
      <Card><Body>Goal</Body><TagRow tags={["friends", "events"]} /></Card>
      <Button>Apply</Button>
      <Button variant="ghost">Reset feed</Button>
    </Screen>
  );
}
