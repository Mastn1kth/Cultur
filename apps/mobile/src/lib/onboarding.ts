import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { api } from "@/lib/client";

export type ProfilePatch = {
  name?: string;
  age?: number;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  goal?: "friends" | "dating" | "events" | "community" | "all";
  languages?: string[];
  cultures?: string[];
  interests?: string[];
};

type OnboardingStep = "welcome" | "city" | "languages" | "culture" | "interests" | "photo" | "complete";

type CurrentProfile = ProfilePatch & {
  profile_complete_pct?: number | null;
  onboarding_step?: OnboardingStep | null;
};

const steps = new Set<OnboardingStep>(["welcome", "city", "languages", "culture", "interests", "photo", "complete"]);
const onboardingStepKey = "onboarding_step";
const onboardingDraftKey = "onboarding_profile_cache";

async function readDraft() {
  const raw = await AsyncStorage.getItem(onboardingDraftKey);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as ProfilePatch;
  } catch {
    return {};
  }
}

function canSaveProfile(patch: ProfilePatch) {
  return Boolean(patch.name && patch.age && patch.city && patch.goal && patch.languages?.length);
}

export async function saveOnboardingStep(step: string, patch: ProfilePatch, nextPath: string) {
  const draft = { ...await readDraft(), ...patch };
  if (canSaveProfile(draft)) {
    await api.patch("/users/me/profile", draft);
  }
  await api.patch("/users/me", { onboarding_step: step });
  await AsyncStorage.setItem(onboardingStepKey, step);
  await AsyncStorage.setItem(onboardingDraftKey, JSON.stringify(draft));
  router.push(nextPath);
}

export async function getOnboardingStep() {
  try {
    const response = await api.get<CurrentProfile | null>("/users/me");
    const step = response.data?.onboarding_step;
    if (step && steps.has(step)) {
      await AsyncStorage.setItem(onboardingStepKey, step);
      return step;
    }
  } catch {
    // AsyncStorage is only a local cache when the backend is unavailable.
  }
  const step = await AsyncStorage.getItem(onboardingStepKey);
  return step && steps.has(step as OnboardingStep) ? step : null;
}

export async function clearOnboardingStep() {
  try {
    await api.patch("/users/me", { onboarding_step: "complete" });
  } catch {
    // Cache cleanup should still happen when the app is offline.
  }
  await Promise.all([
    AsyncStorage.removeItem(onboardingStepKey),
    AsyncStorage.removeItem(onboardingDraftKey)
  ]);
}

function inferStepFromProfile(profile: CurrentProfile | null) {
  if (!profile?.name || !profile.age || !profile.goal) return "welcome";
  if (!profile.city) return "city";
  if (!profile.languages?.length) return "languages";
  if (!profile.interests?.length) return "interests";
  if ((profile.profile_complete_pct ?? 0) >= 100) return null;
  return "photo";
}

export async function getOnboardingResumePath() {
  try {
    const response = await api.get<CurrentProfile | null>("/users/me");
    const serverStep = response.data?.onboarding_step;
    if (serverStep && steps.has(serverStep)) {
      await AsyncStorage.setItem(onboardingStepKey, serverStep);
      if (serverStep !== "complete") return `/onboarding/${serverStep}`;
      return "/(tabs)/discover";
    }
    const inferredStep = inferStepFromProfile(response.data);
    return inferredStep ? `/onboarding/${inferredStep}` : "/(tabs)/discover";
  } catch {
    const storedStep = await AsyncStorage.getItem(onboardingStepKey);
    return storedStep ? `/onboarding/${storedStep}` : "/onboarding/welcome";
  }
}
