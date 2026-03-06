export type Plan = "free" | "pro" | "studio";

export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    description: "For founders just getting started.",
    generationsPerMonth: 10,
    canLinkAccounts: true,
    canPostNow: false,
    canSchedule: false,
    stripePriceId: null,
    features: [
      "10 content generations / month",
      "Tweet, thread, LinkedIn, Reddit, IH",
      "Link social accounts",
      "Copy to clipboard",
      "Content history",
    ],
  },
  pro: {
    name: "Pro",
    price: 12,
    description: "For founders shipping consistently.",
    generationsPerMonth: Infinity,
    canLinkAccounts: true,
    canPostNow: false,
    canSchedule: false,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
    features: [
      "Unlimited content generation",
      "All 5 content formats",
      "Link social accounts",
      "Copy to clipboard",
      "Full content history",
      "Brand voice + example posts",
    ],
  },
  studio: {
    name: "Studio",
    price: 49,
    description: "Full autopilot. We handle the posting.",
    generationsPerMonth: Infinity,
    canLinkAccounts: true,
    canPostNow: true,
    canSchedule: true,
    stripePriceId: process.env.STRIPE_STUDIO_PRICE_ID,
    features: [
      "Everything in Pro",
      "Post directly to Twitter / X",
      "Post directly to LinkedIn",
      "Auto-scheduling with date + time picker",
      "Post queue dashboard",
      "API costs covered — we handle it",
    ],
  },
} as const;

export function canUserPostNow(plan: Plan) {
  return PLANS[plan].canPostNow;
}

export function canUserSchedule(plan: Plan) {
  return PLANS[plan].canSchedule;
}
