import React from "react";
import { Body, Card, Field, H1, Screen } from "@/components/ui";

export default function SearchScreen() {
  const [q, setQ] = React.useState("");
  return <Screen><H1>Search</H1><Field placeholder="People, events, communities" value={q} onChangeText={setQ} /><Card><Body muted>Results will include people, events, and small circles.</Body></Card></Screen>;
}
