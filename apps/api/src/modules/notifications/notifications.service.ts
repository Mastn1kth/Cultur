import { query as defaultQuery } from "../../db/pool.js";

type DbResult<T> = { rows: T[]; rowCount: number | null };
type DbQuery = (text: string, params?: unknown[]) => Promise<DbResult<unknown>>;

type NotificationDeps = {
  query?: DbQuery;
  fetch?: typeof fetch;
};

type PushTokenRow = {
  token: string;
};

function db(deps?: NotificationDeps): DbQuery {
  return (deps?.query ?? defaultQuery) as DbQuery;
}

export async function registerPushToken(userId: string, token: string, deps?: NotificationDeps) {
  await db(deps)(
    `INSERT INTO push_tokens(user_id, token, updated_at)
     VALUES($1, $2, now())
     ON CONFLICT(token) DO UPDATE SET user_id=excluded.user_id, updated_at=now()`,
    [userId, token]
  );
}

export async function sendExpoPush(token: string, title: string, body: string, data: Record<string, unknown>, deps?: NotificationDeps) {
  const fetchImpl = deps?.fetch ?? fetch;
  const response = await fetchImpl("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to: token, title, body, data })
  });
  if (!response.ok) {
    throw new Error(`Expo push failed with ${response.status}`);
  }
}

export async function sendPushToUser(userId: string, title: string, body: string, data: Record<string, unknown>, deps?: NotificationDeps) {
  let tokens: DbResult<PushTokenRow>;
  try {
    tokens = await db(deps)("SELECT token FROM push_tokens WHERE user_id=$1", [userId]) as DbResult<PushTokenRow>;
  } catch (error) {
    console.error("Push token lookup failed", error);
    return;
  }
  await Promise.all(tokens.rows.map(async ({ token }) => {
    try {
      await sendExpoPush(token, title, body, data, deps);
    } catch (error) {
      console.error("Push notification failed", error);
    }
  }));
}
