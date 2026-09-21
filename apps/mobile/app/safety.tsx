import { Link } from "expo-router";
import { Body, Button, Card, H1, Screen } from "@/components/ui";

export default function SafetyCenterScreen() {
  return <Screen><H1>Safety Center</H1><Card><Body>Report, block, hide profile, and verification tools.</Body></Card><Link href="/report" asChild><Button>Report someone</Button></Link><Link href="/blocked-users" asChild><Button variant="ghost">Blocked users</Button></Link></Screen>;
}
