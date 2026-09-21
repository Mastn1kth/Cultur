import { Body, Button, Card, H1, Screen, TagRow } from "@/components/ui";

export default function ReportScreen() {
  return <Screen><H1>Report</H1><Card><Body>Choose a reason</Body><TagRow tags={["fake profile", "harassment", "spam", "inappropriate content", "scam"]} /></Card><Button>Submit report</Button></Screen>;
}
