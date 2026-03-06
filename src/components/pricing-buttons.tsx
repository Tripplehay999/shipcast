"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  planKey: "free" | "pro" | "studio";
  isSignedIn: boolean;
  isStudio: boolean;
}

export function PricingButtons({ planKey, isSignedIn, isStudio }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleUpgrade = async () => {
    if (!isSignedIn) {
      router.push(`/sign-up?plan=${planKey}`);
      return;
    }
    if (planKey === "free") {
      router.push("/dashboard");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      window.location.href = data.url;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  const label =
    planKey === "free"
      ? isSignedIn ? "Go to Dashboard" : "Get started free"
      : loading
      ? "Redirecting..."
      : isSignedIn
      ? `Upgrade to ${planKey === "studio" ? "Studio" : "Pro"}`
      : `Start ${planKey === "studio" ? "Studio" : "Pro"}`;

  return (
    <Button
      className={`w-full ${
        isStudio
          ? "bg-white text-black hover:bg-zinc-200"
          : "border border-zinc-700 bg-transparent text-white hover:bg-zinc-900"
      }`}
      onClick={handleUpgrade}
      disabled={loading}
    >
      {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
      {label}
    </Button>
  );
}
