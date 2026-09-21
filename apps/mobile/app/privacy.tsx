import { Body, Button, Card, H1, Screen } from "@/components/ui";

export default function PrivacyCenterScreen() {
  return (
    <Screen>
      <H1>Privacy Center</H1>
      <Card><Body>What we collect</Body><Body muted>Email, profile fields you choose, approximate location, messages, events, and communities activity.</Body></Card>
      <Card><Body>Who sees sensitive data</Body><Body muted>Religion, sexuality, ethnicity, and politics are voluntary and controlled per field.</Body></Card>
      <Button variant="ghost">Hide from discovery</Button>
    </Screen>
  );
}
