import webpush from "web-push";

/** A reminder for one device, as the database job hands it over. */
export interface PushMessage {
  endpoint: string;
  p256dh: string;
  auth: string;
  title: string;
  body: string;
  tag?: string;
  url?: string;
}

export const pushConfigured = () => Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

let ready = false;
function setup() {
  if (ready) return;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://taxi-henna-five.vercel.app", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  ready = true;
}

/** Only push services of the major browsers; anything else is refused. */
export function isPushEndpoint(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      /(^|\.)(fcm\.googleapis\.com|googleapis\.com|push\.services\.mozilla\.com|notify\.windows\.com|push\.apple\.com|web\.push\.apple\.com)$/.test(u.hostname)
    );
  } catch {
    return false;
  }
}

/** Sends the messages; returns how many went out and the endpoints that no longer exist. */
export async function sendAll(messages: PushMessage[]): Promise<{ sent: number; gone: string[] }> {
  setup();
  let sent = 0;
  const gone: string[] = [];
  await Promise.all(
    messages
      .filter((m) => isPushEndpoint(m.endpoint))
      .map(async (m) => {
        try {
          await webpush.sendNotification(
            { endpoint: m.endpoint, keys: { p256dh: m.p256dh, auth: m.auth } },
            JSON.stringify({ title: m.title.slice(0, 80), body: m.body.slice(0, 200), tag: m.tag, url: m.url ?? "/" }),
            { TTL: 300, urgency: "high" },
          );
          sent++;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) gone.push(m.endpoint);
        }
      }),
  );
  return { sent, gone };
}
