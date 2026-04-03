import { ConvexHttpClient } from "convex/browser";

let convexClient: ConvexHttpClient | null = null;

export const getConvexClient = () => {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  }

  if (!convexClient) {
    convexClient = new ConvexHttpClient(convexUrl);
  }

  return convexClient;
};

export const convex = new Proxy({} as ConvexHttpClient, {
  get(_target, prop, receiver) {
    const client = getConvexClient();
    const value = Reflect.get(client, prop, receiver);

    return typeof value === "function" ? value.bind(client) : value;
  },
});
