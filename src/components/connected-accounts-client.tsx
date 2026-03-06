"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Twitter, Linkedin, CheckCircle2, Link2, MessageCircle } from "lucide-react";

interface ConnectedAccount {
  platform_username: string;
  created_at: string;
}

interface Props {
  connected: {
    twitter: ConnectedAccount | null;
    linkedin: ConnectedAccount | null;
    threads: ConnectedAccount | null;
  };
}

const platforms = [
  {
    key: "twitter" as const,
    label: "Twitter / X",
    icon: Twitter,
    description: "Post tweets and threads directly from Shipcast.",
    connectUrl: "/api/auth/twitter",
    color: "text-sky-400",
  },
  {
    key: "linkedin" as const,
    label: "LinkedIn",
    icon: Linkedin,
    description: "Publish professional posts to your LinkedIn profile.",
    connectUrl: "/api/auth/linkedin",
    color: "text-blue-400",
  },
  {
    key: "threads" as const,
    label: "Threads",
    icon: MessageCircle,
    description: "Post text updates to your Threads profile.",
    connectUrl: "/api/auth/threads",
    color: "text-purple-400",
  },
];

function AccountsInner({ connected }: Props) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const c = searchParams.get("connected");
    const e = searchParams.get("error");
    if (c) toast.success(`${c.charAt(0).toUpperCase() + c.slice(1)} connected!`);
    if (e === "twitter_denied") toast.error("Twitter connection was cancelled.");
    if (e === "linkedin_denied") toast.error("LinkedIn connection was cancelled.");
    if (e === "threads_denied") toast.error("Threads connection was cancelled.");
    if (e === "token_exchange") toast.error("OAuth failed. Try again.");
    if (e === "invalid_state") toast.error("Session expired. Try again.");
  }, [searchParams]);

  return (
    <div className="space-y-4">
      {platforms.map(({ key, label, icon: Icon, description, connectUrl, color }) => {
        const account = connected[key];
        return (
          <Card key={key} className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={color}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-medium text-white text-sm">{label}</p>
                    {account && (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Connected
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">
                    {account ? `@${account.platform_username}` : description}
                  </p>
                </div>
              </div>

              {account ? (
                <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-400 hover:text-white bg-transparent shrink-0" onClick={() => window.location.href = connectUrl}>
                  Reconnect
                </Button>
              ) : (
                <Button size="sm" className="bg-white text-black hover:bg-zinc-200 shrink-0" onClick={() => window.location.href = connectUrl}>
                  <Link2 className="h-3.5 w-3.5 mr-1.5" />
                  Connect
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}

      <div className="mt-6 rounded-xl border border-zinc-900 bg-zinc-950 p-4">
        <p className="text-xs text-zinc-600 leading-relaxed">
          <span className="text-zinc-400">All plans</span> can link accounts. Direct posting and auto-scheduling are{" "}
          <span className="text-zinc-400">Studio plan only</span>.
        </p>
      </div>
    </div>
  );
}

export function ConnectedAccountsClient(props: Props) {
  return (
    <Suspense>
      <AccountsInner {...props} />
    </Suspense>
  );
}
