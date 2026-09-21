import React from "react";
import { Body, Button, Card, EmptyState, Field, Screen, ScreenHeader, TagRow } from "@/components/ui";
import { api } from "@/lib/client";

type ProfileGoal = "friends" | "dating" | "events" | "community" | "all";

type CurrentProfile = {
  name?: string | null;
  age?: number | null;
  bio?: string | null;
  city?: string | null;
  goal?: ProfileGoal | null;
  languages?: string[] | null;
  cultures?: string[] | null;
  interests?: string[] | null;
};

const goals: ProfileGoal[] = ["friends", "dating", "events", "community", "all"];

function parseList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export default function EditProfileScreen() {
  const [name, setName] = React.useState("");
  const [age, setAge] = React.useState("");
  const [city, setCity] = React.useState("");
  const [goal, setGoal] = React.useState<ProfileGoal | "">("");
  const [bio, setBio] = React.useState("");
  const [languages, setLanguages] = React.useState("");
  const [cultures, setCultures] = React.useState("");
  const [interests, setInterests] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [status, setStatus] = React.useState("");

  React.useEffect(() => {
    let mounted = true;
    api.get<CurrentProfile | null>("/users/me")
      .then((response) => {
        if (!mounted || !response.data) return;
        const profile = response.data;
        setName(profile.name ?? "");
        setAge(profile.age ? String(profile.age) : "");
        setCity(profile.city ?? "");
        setGoal(profile.goal ?? "");
        setBio(profile.bio ?? "");
        setLanguages((profile.languages ?? []).join(", "));
        setCultures((profile.cultures ?? []).join(", "));
        setInterests((profile.interests ?? []).join(", "));
      })
      .catch(() => {
        if (mounted) setStatus("Could not load profile");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function saveProfile() {
    const parsedAge = Number(age);
    const parsedLanguages = parseList(languages);
    const parsedGoal = goals.includes(goal as ProfileGoal) ? goal as ProfileGoal : null;
    if (!name.trim() || !Number.isInteger(parsedAge) || parsedAge < 18 || !city.trim() || !parsedGoal || parsedLanguages.length === 0) {
      setStatus("Name, age, city, goal, and at least one language are required");
      return;
    }
    setSaving(true);
    setStatus("");
    try {
      await api.patch("/users/me/profile", {
        name: name.trim(),
        age: parsedAge,
        city: city.trim(),
        goal: parsedGoal,
        bio: bio.trim() || undefined,
        languages: parsedLanguages,
        cultures: parseList(cultures),
        interests: parseList(interests)
      });
      setStatus("Profile saved");
    } catch {
      setStatus("Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  const previewTags = [...parseList(languages), ...parseList(cultures), ...parseList(interests)].slice(0, 6);

  return (
    <Screen>
      <ScreenHeader title="Edit profile" subtitle="Keep required fields complete so discovery can use backend data." />
      {loading ? <EmptyState title="Loading profile..." /> : null}
      <Card>
        <Field placeholder="Name" value={name} onChangeText={setName} />
        <Field placeholder="Age" value={age} onChangeText={setAge} />
        <Field placeholder="City" value={city} onChangeText={setCity} />
        <Field placeholder="Goal: friends, dating, events, community, all" value={goal} onChangeText={(value) => setGoal(value as ProfileGoal | "")} />
        <Field placeholder="Bio" value={bio} onChangeText={setBio} />
      </Card>
      <Card tone="soft">
        <Body strong>Culture signals</Body>
        <Field placeholder="Languages, comma separated" value={languages} onChangeText={setLanguages} />
        <Field placeholder="Cultures, comma separated" value={cultures} onChangeText={setCultures} />
        <Field placeholder="Interests, comma separated" value={interests} onChangeText={setInterests} />
        <Body muted>Sensitive fields are optional and stay controlled by profile visibility settings.</Body>
      </Card>
      {previewTags.length ? <TagRow tags={previewTags} /> : null}
      {status ? <Body muted>{status}</Body> : null}
      <Button onPress={saveProfile} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
    </Screen>
  );
}
