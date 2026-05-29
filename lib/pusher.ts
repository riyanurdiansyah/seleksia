import Pusher from "pusher";

const isSoketi = process.env.NEXT_PUBLIC_USE_SOKETI === "true";

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID || "app-id",
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || "app-key",
  secret: process.env.PUSHER_SECRET || "app-secret",
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "mt1",
  useTLS: isSoketi ? false : true,
  host: isSoketi ? (process.env.PUSHER_HOST || "127.0.0.1") : undefined,
  port: isSoketi ? (process.env.PUSHER_PORT || "6001") : undefined,
});
