import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { query, pool } from "./pool.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const schema = fs.readFileSync(path.join(dirname, "schema.sql"), "utf8");

const cities = [
  ["Chicago", "US", 41.8781, -87.6298],
  ["Champaign", "US", 40.1164, -88.2434],
  ["New York", "US", 40.7128, -74.006],
  ["Toronto", "CA", 43.6532, -79.3832],
  ["Berlin", "DE", 52.52, 13.405]
] as const;
const languages = ["English", "Russian", "Spanish", "Arabic", "Turkish", "Ukrainian", "Uzbek"];
const cultures = ["Russian", "Uzbek", "Mexican", "Syrian", "Turkish", "Ukrainian", "Tatar"];
const interests = ["martial arts", "cooking", "music", "books", "football", "language exchange", "hiking", "film", "coffee"];
const goals = ["friends", "dating", "events", "community", "all"] as const;
const names = ["Amina", "Daniil", "Sofia", "Timur", "Maya", "Oleg", "Layla", "Nikita", "Elena", "Rustam"];

function pick<T>(items: readonly T[], i: number, offset = 0) {
  return items[(i + offset) % items.length];
}

async function main() {
  await query(schema);
  await query("TRUNCATE compatibility_cache, community_messages, community_members, communities, event_attendees, events, messages, conversations, matches, swipes, photos, auth_providers, magic_links, refresh_tokens, reports, blocks, icebreakers, profiles, users RESTART IDENTITY CASCADE");

  const userIds: string[] = [];
  for (let i = 0; i < 50; i += 1) {
    const user = await query<{ id: string }>("INSERT INTO users(email,is_verified,last_active,onboarding_step) VALUES($1,true,now(),'complete') RETURNING id", [`demo${i + 1}@culturematch.local`]);
    const userId = user.rows[0].id;
    userIds.push(userId);
    const city = pick(cities, i);
    const userLanguages = [pick(languages, i), pick(languages, i, 2)];
    const userCultures = [pick(cultures, i)];
    const userInterests = [pick(interests, i), pick(interests, i, 3), pick(interests, i, 5)];
    await query(
      `INSERT INTO profiles(user_id,name,age,bio,city,country,latitude,longitude,location,goal,languages,cultures,interests,religion,religion_visibility,university,profile_complete_pct)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,ST_SetSRID(ST_MakePoint($8,$7),4326)::geography,$9,$10,$11,$12,$13,'matching_only',$14,100)`,
      [
        userId,
        `${pick(names, i)} ${i + 1}`,
        18 + (i % 22),
        "Looking for honest local connections, language exchange, and low-pressure community.",
        city[0],
        city[1],
        city[2] + (i % 5) * 0.01,
        city[3] + (i % 5) * 0.01,
        pick(goals, i),
        userLanguages,
        userCultures,
        userInterests,
        i % 3 === 0 ? "Muslim" : i % 3 === 1 ? "Christian" : null,
        i % 4 === 0 ? "UIUC" : null
      ]
    );
    await query(
      "INSERT INTO photos(user_id,url,thumbnail_url,order_index,is_primary) VALUES($1,$2,$2,0,true)",
      [userId, `https://randomuser.me/api/portraits/${i % 2 ? "men" : "women"}/${(i % 70) + 1}.jpg`]
    );
  }

  for (let i = 0; i < 10; i += 1) {
    const city = pick(cities, i);
    await query(
      "INSERT INTO events(creator_id,title,description,city,latitude,longitude,location,languages,cultures,interests,starts_at,ends_at,max_attendees,is_public) VALUES($1,$2,$3,$4,$5,$6,ST_SetSRID(ST_MakePoint($6,$5),4326)::geography,$7,$8,$9,now()+($10 || ' days')::interval,now()+($11 || ' days')::interval,40,true)",
      [pick(userIds, i), `${pick(cultures, i)} community dinner`, "Food, stories, and new friends.", city[0], city[2], city[3], [pick(languages, i)], [pick(cultures, i)], [pick(interests, i)], String(i + 1), String(i + 1)]
    );
  }

  for (let i = 0; i < 5; i += 1) {
    const city = pick(cities, i);
    const community = await query<{ id: string }>(
      "INSERT INTO communities(creator_id,name,description,city,languages,cultures,interests,max_members,is_public) VALUES($1,$2,$3,$4,$5,$6,$7,20,true) RETURNING id",
      [pick(userIds, i), `${pick(languages, i)} speakers in ${city[0]}`, "Small circle for practical help, language, and friendship.", city[0], [pick(languages, i)], [pick(cultures, i)], [pick(interests, i)]]
    );
    await query("INSERT INTO community_members(community_id,user_id,role) VALUES($1,$2,'admin')", [community.rows[0].id, pick(userIds, i)]);
  }

  const icebreakers = [
    ["culture", "en", "Ask about their favorite dish from home."],
    ["culture", "en", "What tradition do you want to keep alive?"],
    ["language", "en", "What phrase in your language is impossible to translate?"],
    ["home", "en", "What do you miss most from your country?"],
    ["events", "en", "What local event would make you feel at home?"],
    ["friends", "en", "What helped you make friends after moving?"],
    ["food", "en", "Which grocery store feels closest to home?"],
    ["music", "en", "What song reminds you of your family?"],
    ["values", "en", "What family value shaped you most?"],
    ["study", "en", "What advice would you give a new international student?"],
    ["culture", "ru", "Спроси о любимом блюде из дома."],
    ["culture", "ru", "Какую традицию хочется сохранить?"],
    ["language", "ru", "Какая фраза на твоём языке плохо переводится?"],
    ["home", "ru", "Чего больше всего не хватает из дома?"],
    ["events", "ru", "Какое событие помогло бы почувствовать себя своим?"],
    ["friends", "ru", "Что помогло найти друзей после переезда?"],
    ["food", "ru", "Какой магазин больше всего напоминает дом?"],
    ["music", "ru", "Какая песня напоминает о семье?"],
    ["values", "ru", "Какая семейная ценность сильнее всего повлияла?"],
    ["study", "ru", "Какой совет ты бы дал новому international student?"]
  ];
  for (const row of icebreakers) {
    await query("INSERT INTO icebreakers(category,language,question) VALUES($1,$2,$3)", row);
  }

  console.log("Seeded CultureMatch demo data");
}

main().finally(() => pool.end());
