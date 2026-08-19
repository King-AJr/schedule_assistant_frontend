import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Github,
  Loader2,
  Plug,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";

type IntegrationStatus = {
  provider: string;
  name: string;
  description: string;
  scopes: string[];
  connected: boolean;
};

type MCPConnection = {
  id: string;
  name: string;
  slug: string;
  url: string;
  transport: "http" | "streamable_http" | "sse";
  enabled: boolean;
  allow_autonomous_reads: boolean;
  status: string;
  last_discovered_at?: string | null;
  last_error_class?: string | null;
};

type MCPTool = {
  id: string;
  connection_id: string;
  remote_name: string;
  exposed_name: string;
  description?: string | null;
  effect: string;
  risk: string;
  status: string;
};

type MCPOAuthStatus = {
  connection_id?: string;
  connection?: string;
  connection_slug?: string;
  status: string;
  issuer?: string;
  scopes?: string[] | string;
  access_token_expires_at?: string | null;
  last_error?: string | null;
};

const statusClass = (status: string) => {
  const normalized = status.toLowerCase();
  if (["connected", "healthy", "ready", "configured", "active"].includes(normalized)) {
    return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
  }
  if (["error", "revoked", "reauthorization_required", "disabled"].includes(normalized)) {
    return "bg-destructive/10 text-destructive border-destructive/20";
  }
  return "bg-muted text-muted-foreground border-border";
};

const IntegrationsSettings: React.FC = () => {
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [connections, setConnections] = useState<MCPConnection[]>([]);
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [oauth, setOauth] = useState<MCPOAuthStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [transport, setTransport] = useState<MCPConnection["transport"]>("streamable_http");
  const [allowReads, setAllowReads] = useState(false);
  const [headerName, setHeaderName] = useState("");
  const [headerValue, setHeaderValue] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [oauthClientId, setOauthClientId] = useState("");
  const [oauthClientSecret, setOauthClientSecret] = useState("");
  const [oauthScopes, setOauthScopes] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [integrationRows, connectionRows, toolRows, oauthRows] = await Promise.all([
        apiFetch<IntegrationStatus[]>("/integrations"),
        apiFetch<MCPConnection[]>("/integrations/mcp/connections"),
        apiFetch<MCPTool[]>("/integrations/mcp/tools"),
        apiFetch<MCPOAuthStatus[]>("/integrations/mcp/oauth/status").catch(() => []),
      ]);
      setIntegrations(integrationRows);
      setConnections(connectionRows);
      setTools(toolRows);
      setOauth(oauthRows);
    } catch (error) {
      toast({
        title: "Could not load integrations",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void refresh();
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    if (connected === "mcp" || connected === "github" || connected === "google") {
      const label = connected === "mcp" ? "MCP" : connected === "github" ? "GitHub" : "Google";
      toast({ title: `${label} connected` });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [refresh, toast]);

  const toolCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tool of tools) counts.set(tool.connection_id, (counts.get(tool.connection_id) || 0) + 1);
    return counts;
  }, [tools]);

  const oauthFor = (connection: MCPConnection) =>
    oauth.find(
      (row) =>
        row.connection_id === connection.id ||
        row.connection === connection.slug ||
        row.connection_slug === connection.slug,
    );

  const createMcp = async () => {
    if (!name.trim() || !url.trim()) {
      toast({ title: "Name and URL are required", variant: "destructive" });
      return;
    }
    setBusy("create");
    try {
      const headers = headerName.trim() && headerValue ? { [headerName.trim()]: headerValue } : undefined;
      const created = await apiFetch<MCPConnection>("/integrations/mcp/connections", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          url: url.trim(),
          transport,
          allow_autonomous_reads: allowReads,
          headers,
        }),
      });
      setName("");
      setUrl("");
      setHeaderName("");
      setHeaderValue("");
      toast({
        title: "MCP connection created",
        description: "Discover its tools next. OAuth can be configured if the server is protected.",
      });
      await discover(created.slug, false);
      await refresh();
    } catch (error) {
      toast({
        title: "Could not create MCP connection",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const discover = async (slug: string, announce = true) => {
    setBusy(`discover:${slug}`);
    try {
      const result = await apiFetch<{ tool_count: number }>(
        `/integrations/mcp/connections/${encodeURIComponent(slug)}/discover`,
        { method: "POST" },
      );
      if (announce) {
        toast({ title: "MCP tools discovered", description: `${result.tool_count} tool(s) registered.` });
      }
      await refresh();
    } catch (error) {
      if (announce) {
        toast({
          title: "Discovery needs attention",
          description: error instanceof Error ? error.message : "The server may require OAuth first.",
          variant: "destructive",
        });
      }
    } finally {
      setBusy(null);
    }
  };

  const configureOauth = async (connection: MCPConnection) => {
    setBusy(`oauth:${connection.slug}`);
    try {
      await apiFetch(`/integrations/mcp/oauth/${encodeURIComponent(connection.slug)}/configure`, {
        method: "POST",
        body: JSON.stringify({
          client_id: oauthClientId.trim() || null,
          client_secret: oauthClientSecret || null,
          token_endpoint_auth_method: oauthClientSecret ? "client_secret_post" : "none",
          scopes: oauthScopes.trim() || null,
        }),
      });
      const result = await apiFetch<{ authorization_url: string }>(
        `/integrations/mcp/oauth/${encodeURIComponent(connection.slug)}/authorize-url`,
        { method: "POST" },
      );
      setOauthClientSecret("");
      window.location.assign(result.authorization_url);
    } catch (error) {
      toast({
        title: "Could not start MCP OAuth",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      setBusy(null);
    }
  };

  const refreshOauth = async (connection: MCPConnection) => {
    setBusy(`refresh:${connection.slug}`);
    try {
      await apiFetch(`/integrations/mcp/oauth/${encodeURIComponent(connection.slug)}/refresh`, {
        method: "POST",
      });
      toast({ title: "Authorization refreshed" });
      await refresh();
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: error instanceof Error ? error.message : "Reconnect the provider.",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const removeMcp = async (connection: MCPConnection) => {
    if (!window.confirm(`Disconnect ${connection.name}?`)) return;
    setBusy(`delete:${connection.id}`);
    try {
      await apiFetch(`/integrations/mcp/connections/${connection.id}`, { method: "DELETE" });
      toast({ title: "MCP connection removed" });
      await refresh();
    } catch (error) {
      toast({
        title: "Could not remove connection",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const connectProvider = async (provider: "github" | "google") => {
    setBusy(provider);
    try {
      const result = await apiFetch<{ authorization_url: string }>(`/integrations/${provider}/auth-url`, {
        method: "POST",
      });
      window.location.assign(result.authorization_url);
    } catch (error) {
      toast({
        title: `Could not start ${provider === "github" ? "GitHub" : "Google"} connection`,
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      setBusy(null);
    }
  };

  const disconnectProvider = async (provider: string) => {
    setBusy(`provider:${provider}`);
    try {
      await apiFetch(`/integrations/${encodeURIComponent(provider)}`, { method: "DELETE" });
      toast({ title: "Integration disconnected" });
      await refresh();
    } catch (error) {
      toast({
        title: "Could not disconnect integration",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading integrations…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-medium">Integrations</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect user-owned services and MCP servers. Connecting an account gives the assistant access
          to that resource; action approvals and safety policy still apply separately.
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="font-medium">Connected accounts</h3>
        {integrations.map((integration) => (
          <div key={integration.provider} className="flex flex-col gap-3 rounded-xl border border-white/10 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 font-medium">
                {integration.provider === "github" ? <Github className="h-4 w-4" /> : <Plug className="h-4 w-4" />}
                {integration.name}
                <span className={`rounded-full border px-2 py-0.5 text-xs ${statusClass(integration.connected ? "connected" : "not_connected")}`}>
                  {integration.connected ? "Connected" : "Not connected"}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{integration.description}</p>
            </div>
            <div className="flex gap-2">
              {(integration.provider === "github" || integration.provider === "google") && !integration.connected && (
                <Button
                  onClick={() => connectProvider(integration.provider as "github" | "google")}
                  disabled={busy === integration.provider}
                >
                  {busy === integration.provider && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Connect
                </Button>
              )}
              {integration.provider === "notion" && !integration.connected && (
                <Button variant="outline" disabled title="Notion browser-safe OAuth UI is not standardized yet">
                  Connect via existing flow
                </Button>
              )}
              {integration.connected && (
                <Button variant="outline" onClick={() => disconnectProvider(integration.provider)} disabled={busy === `provider:${integration.provider}`}>
                  Disconnect
                </Button>
              )}
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-4 border-t border-white/10 pt-6">
        <div>
          <h3 className="flex items-center gap-2 font-medium"><Wrench className="h-4 w-4" /> MCP servers</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            OAuth is preferred. Static headers are available only for MCP servers that do not support OAuth;
            secret values are sent directly to the backend, encrypted there, and never displayed again.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Connection name" />
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://mcp.example.com/mcp" />
          <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={transport} onChange={(e) => setTransport(e.target.value as MCPConnection["transport"])}>
            <option value="streamable_http">Streamable HTTP</option>
            <option value="http">HTTP</option>
            <option value="sse">SSE</option>
          </select>
          <label className="flex items-center justify-between rounded-md border border-input px-3 py-2 text-sm">
            Allow verified read-only tools without approval
            <Switch checked={allowReads} onCheckedChange={setAllowReads} />
          </label>
        </div>

        <Button variant="ghost" size="sm" onClick={() => setShowAdvanced((value) => !value)}>
          {showAdvanced ? "Hide advanced credentials" : "Advanced compatibility credentials"}
        </Button>
        {showAdvanced && (
          <div className="space-y-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Input value={headerName} onChange={(e) => setHeaderName(e.target.value)} placeholder="Static header name (optional)" />
              <Input type="password" value={headerValue} onChange={(e) => setHeaderValue(e.target.value)} placeholder="Static header value — never shown again" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input value={oauthClientId} onChange={(e) => setOauthClientId(e.target.value)} placeholder="OAuth client ID if server requires pre-registration" />
              <Input type="password" value={oauthClientSecret} onChange={(e) => setOauthClientSecret(e.target.value)} placeholder="OAuth client secret if required" />
              <Input className="md:col-span-2" value={oauthScopes} onChange={(e) => setOauthScopes(e.target.value)} placeholder="OAuth scopes, space-separated (optional)" />
            </div>
          </div>
        )}

        <Button onClick={createMcp} disabled={busy === "create"}>
          {busy === "create" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plug className="mr-2 h-4 w-4" />}
          Add MCP server
        </Button>

        <div className="space-y-3">
          {connections.length === 0 && <div className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-muted-foreground">No MCP servers connected yet.</div>}
          {connections.map((connection) => {
            const auth = oauthFor(connection);
            return (
              <div key={connection.id} className="rounded-xl border border-white/10 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{connection.name}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${statusClass(connection.status)}`}>{connection.status}</span>
                      {auth?.status && <span className={`rounded-full border px-2 py-0.5 text-xs ${statusClass(auth.status)}`}>OAuth: {auth.status}</span>}
                    </div>
                    <div className="mt-1 break-all text-xs text-muted-foreground">{connection.url}</div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {toolCount.get(connection.id) || 0} discovered tool(s) · {connection.transport} · autonomous reads {connection.allow_autonomous_reads ? "enabled" : "off"}
                    </div>
                    {auth?.last_error && <div className="mt-2 text-xs text-destructive">{auth.last_error}</div>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => discover(connection.slug)} disabled={busy === `discover:${connection.slug}`}>
                      <Search className="mr-2 h-3.5 w-3.5" /> Discover
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => configureOauth(connection)} disabled={busy === `oauth:${connection.slug}`}>
                      <ShieldCheck className="mr-2 h-3.5 w-3.5" /> {auth ? "Reconnect OAuth" : "Connect OAuth"}
                    </Button>
                    {auth && (
                      <Button size="sm" variant="ghost" onClick={() => refreshOauth(connection)} disabled={busy === `refresh:${connection.slug}`}>
                        <RefreshCw className="mr-2 h-3.5 w-3.5" /> Refresh
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeMcp(connection)} disabled={busy === `delete:${connection.id}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {(toolCount.get(connection.id) || 0) > 0 && (
                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    {tools.filter((tool) => tool.connection_id === connection.id).slice(0, 8).map((tool) => (
                      <div key={tool.id} className="rounded-lg bg-muted/40 p-2 text-xs">
                        <div className="font-medium">{tool.remote_name}</div>
                        <div className="mt-1 text-muted-foreground">{tool.effect} · risk {tool.risk} · {tool.status}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default IntegrationsSettings;