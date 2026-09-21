import { Body, Card, H1, Screen } from "@/components/ui";

const cards = ["Language card", "Food & traditions card", "Holidays card", "Music & art card", "Family values card", "Immigration story card"];

export default function CultureCardsScreen() {
  return <Screen><H1>Culture Cards</H1>{cards.map((card) => <Card key={card}><Body>{card}</Body><Body muted>Visible according to your profile privacy settings.</Body></Card>)}</Screen>;
}
