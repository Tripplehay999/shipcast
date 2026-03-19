"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight } from "lucide-react";

export function UrlAnalyzeForm() {
  const [url, setUrl] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    router.push(`/sign-up?url=${encodeURIComponent(url.trim())}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-xl mx-auto mb-4"
    >
      <Input
        type="url"
        placeholder="https://yourproduct.com"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 h-11 flex-1"
      />
      <Button
        type="submit"
        size="lg"
        className="bg-white text-black hover:bg-zinc-200 px-6 h-11 shrink-0"
        disabled={!url.trim()}
      >
        Analyze free <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </form>
  );
}
