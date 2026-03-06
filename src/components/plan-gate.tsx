"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

interface PlanGateProps {
  requiredPlan: "pro" | "studio";
  currentPlan: "free" | "pro" | "studio";
  children: React.ReactNode;
  featureName: string;
}

const planRank = { free: 0, pro: 1, studio: 2 };

export function PlanGate({ requiredPlan, currentPlan, children, featureName }: PlanGateProps) {
  if (planRank[currentPlan] >= planRank[requiredPlan]) return <>{children}</>;

  const planLabel = requiredPlan === "studio" ? "Studio ($49/mo)" : "Pro ($12/mo)";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-center">
      <Lock className="h-6 w-6 text-zinc-600 mx-auto mb-3" />
      <p className="text-sm font-medium text-white mb-1">{featureName}</p>
      <p className="text-xs text-zinc-500 mb-4">
        Available on the {planLabel} plan.
      </p>
      <Link href="/pricing">
        <Button size="sm" className="bg-white text-black hover:bg-zinc-200">
          Upgrade to unlock
        </Button>
      </Link>
    </div>
  );
}
