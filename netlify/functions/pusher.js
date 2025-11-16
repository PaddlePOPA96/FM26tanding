import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

export async function handler(event) {
  const body = JSON.parse(event.body || "{}");

  await pusher.trigger("fm24-league", "data-updated", body);

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true }),
  };
}
