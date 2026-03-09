import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function requireAdmin(): Promise<string> {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const adminIds = (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (adminIds.length > 0 && !adminIds.includes(userId)) {
    redirect("/dashboard");
  }

  return userId;
}
