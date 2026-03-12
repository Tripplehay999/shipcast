import { auth } from "@clerk/nextjs/server";
import { getUserPlan } from "@/lib/stripe";
import { NewUpdateClient } from "@/components/new-update-client";

export default async function NewUpdatePage() {
  const { userId } = await auth();
  const plan = await getUserPlan(userId!);
  return <NewUpdateClient plan={plan} />;
}
