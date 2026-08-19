import React, { useEffect, useState } from "react";
import { Copy, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getReplaySessionId } from "@/lib/observability";
import { toast } from "sonner";

const DebugSessionPanel: React.FC = () => {
  const [sessionId, setSessionId] = useState<string | null>(() => getReplaySessionId());

  useEffect(() => {
    if (sessionId) return;
    const timer = window.setInterval(() => {
      const value = getReplaySessionId();
      if (value) {
        setSessionId(value);
        window.clearInterval(timer);
      }
    }, 750);
    return () => window.clearInterval(timer);
  }, [sessionId]);

  const copy = async () => {
    if (!sessionId) return;
    await navigator.clipboard.writeText(sessionId);
    toast.success("Debug session ID copied");
  };

  return (
    <div className="rounded-xl border border-white/10 bg-secondary/30 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-primary mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="font-medium">Debug session</div>
          <p className="text-sm text-muted-foreground mt-1">
            Share this ID with support instead of screenshots. It correlates the browser replay,
            backend logs, and AI trace for this session; it does not grant account access.
          </p>
        </div>
      </div>
      <div className="flex gap-2 items-center">
        <code className="min-w-0 flex-1 truncate rounded-md bg-background/60 px-3 py-2 text-xs">
          {sessionId || "Session replay is disabled or still starting"}
        </code>
        <Button type="button" variant="outline" size="sm" onClick={copy} disabled={!sessionId}>
          <Copy className="w-4 h-4 mr-2" /> Copy
        </Button>
      </div>
    </div>
  );
};

export default DebugSessionPanel;
