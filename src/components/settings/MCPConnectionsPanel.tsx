import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  PlugZap,
  Plus,
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

const API_URL = import.meta.env.VITE_API_URL;

type MCPConnection = {
  id: string;
  name: string;
  slug: string;
  url: string;
  transport: string;
  enabled: boolean;
  allow_autonomous_reads: boolean;
  status: string;
  config_version: number;
  last_discovered_at?: string | null;
  last_error_class?: string | null;
  created_at: string;
};

type MCPTool = {
  id: string;
  connection_id: string;
  remote_name: string;
  exposed_name: string;
  description: string;
  effect: string;
  risk: string;
  status: string;
  last_seen_at: string;
};

type MCPOAuthStatus = {
  connection_id: string;
  connection?: string | null;
  issuer: string;
  resource: string;
  status: string;
  scopes: string[];
  access_token_expires_at?: string | null;
  refresh_token_expires_at?: string | null;
  last_checked_at?: string | null;
  last_error?: string | null;
};

type HeaderRow = { key: string; value: string };

type OAuthDraft = {
  clientId: string;
  clientSecret: string;
  scopes: string;
  authMethod: "none" | "client_secret_post" | "client_secret_basic";
};

const EMPTY_OAUTH: OAuthDraft = {
  clientId: "",
  clientSecret: "",
  scopes: "",
  authMethod: "none",
};

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("authToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers || {}) },
  });
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = payload?.detail || payload?.message || `Request failed (${response.status})`;
    throw new Error(detail);
  }
  return payload as T;
}

const MCPConnectionsPanel: React.FC = () => {
  const { toast } = useToast();
  const [connections, setConnections] = useState<MCPConnection[]>([]);
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [oauth, setOauth] = useState<MCPOAuthStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [oauthOpen, setOauthOpen] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [transport, setTransport] = useState("http");
  const [allowReads, setAllowReads] = useState(false);
  const [headers, setHeaders] = useState<HeaderRow[]>([{ key: "", value: "" }]);
  const [oauthDrafts, setOauthDrafts] = useState<Record<string, OAuthDraft>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [connectionRows, toolRows, oauthRows] = await Promise.all([
        api<MCPConnection[]>("/integrations/mcp/connections"),
        api<MCPTool[]>("/integrations/mcp/tools"),
        api<MCPOAuthStatus[]>("/integrations/mcp/oauth/status"),
      ]);
      setConnections(connectionRows);
      setTools(toolRows);
      setOauth(oauthRows);
    } catch (error) {
      toast({
        title: "Could not load integrations",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") !== "mcp") return;
    toast({ title: "MCP connected", description: "Authorization completed successfully." });
    params.delete("connected");
    params.delete("connection_id");
    params.set("section", "integrations");
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
    void load();
  }, [load, toast]);

  const toolsByConnection = useMemo(() => {
    const grouped = new Map<string, MCPTool[]>();
    for (const tool of tools) {
      grouped.set(tool.connection_id, [...(grouped.get(tool.connection_id) || []), tool]);
    }
    return grouped;
  }, [tools]);

  const oauthBySlug = useMemo(() => {
    const grouped = new Map<string, MCPOAuthStatus>();
    for (const row of oauth) if (row.connection) grouped.set(row.connection, row);
    return grouped;
  }, [oauth]);

  const createConnection = async () => {
    if (!name.trim() || !url.trim()) {
      toast({ title: "Name and URL are required", variant: "destructive" });
      return;
    }
    const staticHeaders = Object.fromEntries(
      headers
        .map((row) => [row.key.trim(), row.value] as const)
        .filter(([key, value]) => key && value),
    );
    setBusy("create");
    try {
      await api<MCPConnection>("/integrations/mcp/connections", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          url: url.trim(),
          transport,
          headers: staticHeaders,
          allow_autonomous_reads: allowReads,
        }),
      });
      setName("");
      setUrl("");
      setTransport("http");
      setAllowReads(false);
      setHeaders([{ key: "", value: "" }]);
      setShowAdvanced(false);
      setShowCreate(false);
      toast({ title: "MCP server added", description: "Discover its tools before using it." });
      await load();
    } catch (error) {
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Could not add MCP server.",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const discover = async (connection: MCPConnection) => {
    setBusy(`discover:${connection.id}`);
    try {
      const result = await api<{ tool_count: number }>(
        `/integrations/mcp/connections/${encodeURIComponent(connection.slug)}/discover`,
        { method: "POST" },
      );
      toast({
        title: "Discovery complete",
        description: `${result.tool_count} tool${result.tool_count === 1 ? "" : "s"} registered.`,
      });
      await load();
    } catch (error) {
      toast({
        title: "Discovery failed",
        description: error instanceof Error ? error.message : "Could not discover tools.",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const configureOAuth = async (connection: MCPConnection) => {
    const draft = oauthDrafts[connection.slug] || EMPTY_OAUTH;
    setBusy(`oauth:${connection.id}`);
    try {
      await api(`/integrations/mcp/oauth/${encodeURIComponent(connection.slug)}/configure`, {
        method: "POST",
        body: JSON.stringify({
          client_id: draft.clientId.trim() || null,
          client_secret: draft.clientSecret || null,
          token_endpoint_auth_method: draft.authMethod,
          scopes: draft.scopes.trim() || null,
        }),
      });
      const { authorization_url } = await api<{ authorization_url: string }>(
        `/integrations/mcp/oauth/${encodeURIComponent(connection.slug)}/authorize-url`,
        { method: "POST" },
      );
      window.location.assign(authorization_url);
    } catch (error) {
      toast({
        title: "OAuth setup failed",
        description: error instanceof Error ? error.message : "Could not start authorization.",
        variant: "destructive",
      });
      setBusy(null);
    }
  };

  const reauthorize = async (connection: MCPConnection) => {
    setBusy(`oauth:${connection.id}`);
    try {
      const { authorization_url } = await api<{ authorization_url: string }>(
        `/integrations/mcp/oauth/${encodeURIComponent(connection.slug)}/authorize-url`,
        { method: "POST" },
      );
      window.location.assign(authorization_url);
    } catch (error) {
      toast({
        title: "Authorization failed",
        description: error instanceof Error ? error.message : "Could not start authorization.",
        variant: "destructive",
      });
      setBusy(null);
    }
  };

  const refreshOAuth = async (connection: MCPConnection) => {
    setBusy(`refresh:${connection.id}`);
    try {
      await api(`/integrations/mcp/oauth/${encodeURIComponent(connection.slug)}/refresh`, {
        method: "POST",
      });
      toast({ title: "Authorization refreshed" });
      await load();
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: error instanceof Error ? error.message : "Could not refresh authorization.",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const removeConnection = async (connection: MCPConnection) => {
    if (!window.confirm(`Disconnect ${connection.name}? Its stored MCP credentials and tools will be removed.`)) {
      return;
    }
    setBusy(`delete:${connection.id}`);
    try {
      await api<void>(`/integrations/mcp/connections/${connection.id}`, { method: "DELETE" });
      toast({ title: "MCP server disconnected" });
      await load();
    } catch (error) {
      toast({
        title: "Disconnect failed",
        description: error instanceof Error ? error.message : "Could not remove MCP server.",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const updateDraft = (slug: string, patch: Partial<OAuthDraft>) => {
    setOauthDrafts((current) => ({
      ...current,
      [slug]: { ...(current[slug] || EMPTY_OAUTH), ...patch },
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-medium">Integrations</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect MCP servers so the assistant can discover new capabilities. Connection never bypasses approvals or action policy.
          </p>
        </div>
        <Button onClick={() => setShowCreate((value) => !value)}>
          <Plus className="mr-2 h-4 w-4" /> Add MCP server
        </Button>
      </div>

      {showCreate && (
        <div className="space-y-4 rounded-xl border border-white/10 bg-background/40 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Connection name</label>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Company tools" />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">MCP server URL</label>
              <Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://mcp.example.com/mcp" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Transport</label>
              <select
                value={transport}
                onChange={(event) => setTransport(event.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="http">HTTP</option>
                <option value="streamable_http">Streamable HTTP</option>
                <option value="sse">SSE</option>
              </select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
              <div>
                <div className="text-sm font-medium">Allow autonomous reads</div>
                <div className="text-xs text-muted-foreground">Only conservatively classified read-only tools can use this trust.</div>
              </div>
              <Switch checked={allowReads} onCheckedChange={setAllowReads} />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced((value) => !value)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Advanced static headers
          </button>

          {showAdvanced && (
            <div className="space-y-3 rounded-lg border border-white/10 p-3">
              <p className="text-xs text-muted-foreground">
                Prefer OAuth when the provider supports it. Static headers are encrypted by the backend and are never echoed back.
              </p>
              {headers.map((row, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                  <Input
                    value={row.key}
                    onChange={(event) => setHeaders((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, key: event.target.value } : item))}
                    placeholder="Header name"
                  />
                  <Input
                    type="password"
                    value={row.value}
                    onChange={(event) => setHeaders((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item))}
                    placeholder="Secret value"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setHeaders((items) => items.filter((_, itemIndex) => itemIndex !== index))}
                    disabled={headers.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setHeaders((items) => [...items, { key: "", value: "" }])}>
                <Plus className="mr-2 h-3.5 w-3.5" /> Add header
              </Button>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={createConnection} disabled={busy === "create"}>
              {busy === "create" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save connection
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading integrations…
        </div>
      ) : connections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 p-8 text-center">
          <PlugZap className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <div className="font-medium">No MCP servers connected</div>
          <div className="mt-1 text-sm text-muted-foreground">Add a remote MCP endpoint to discover tools for your assistant.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {connections.map((connection) => {
            const connectionTools = toolsByConnection.get(connection.id) || [];
            const oauthStatus = oauthBySlug.get(connection.slug);
            const draft = oauthDrafts[connection.slug] || EMPTY_OAUTH;
            const connected = oauthStatus?.status === "connected";
            const needsReauth = oauthStatus?.status === "reauthorization_required";
            return (
              <div key={connection.id} className="rounded-xl border border-white/10 bg-background/35 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium">{connection.name}</div>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${connection.enabled ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
                        {connection.enabled ? "Enabled" : connection.status}
                      </span>
                      {connected && (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-500">
                          <ShieldCheck className="h-3 w-3" /> OAuth connected
                        </span>
                      )}
                      {needsReauth && <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-500">Reauthorization required</span>}
                    </div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">{connection.url}</div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>{connection.transport}</span>
                      <span>{connectionTools.length} discovered tool{connectionTools.length === 1 ? "" : "s"}</span>
                      <span>{connection.allow_autonomous_reads ? "Trusted safe reads" : "Reads require normal policy"}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => discover(connection)} disabled={busy === `discover:${connection.id}`}>
                      {busy === `discover:${connection.id}` ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Search className="mr-2 h-3.5 w-3.5" />}
                      Discover
                    </Button>
                    {connected ? (
                      <Button variant="outline" size="sm" onClick={() => refreshOAuth(connection)} disabled={busy === `refresh:${connection.id}`}>
                        <RefreshCw className={`mr-2 h-3.5 w-3.5 ${busy === `refresh:${connection.id}` ? "animate-spin" : ""}`} /> Refresh OAuth
                      </Button>
                    ) : needsReauth ? (
                      <Button variant="outline" size="sm" onClick={() => reauthorize(connection)} disabled={busy === `oauth:${connection.id}`}>
                        <ExternalLink className="mr-2 h-3.5 w-3.5" /> Reauthorize
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setOauthOpen((value) => value === connection.slug ? null : connection.slug)}>
                        <ShieldCheck className="mr-2 h-3.5 w-3.5" /> OAuth
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => removeConnection(connection)} disabled={busy === `delete:${connection.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {oauthOpen === connection.slug && !connected && !needsReauth && (
                  <div className="mt-4 space-y-3 rounded-lg border border-white/10 p-3">
                    <div>
                      <div className="text-sm font-medium">OAuth authorization</div>
                      <div className="text-xs text-muted-foreground">
                        Leave Client ID empty when the provider supports Client ID Metadata Documents. Otherwise enter the provider-issued credentials.
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input value={draft.clientId} onChange={(event) => updateDraft(connection.slug, { clientId: event.target.value })} placeholder="Client ID (optional)" />
                      <Input type="password" value={draft.clientSecret} onChange={(event) => updateDraft(connection.slug, { clientSecret: event.target.value })} placeholder="Client secret (optional)" />
                      <Input value={draft.scopes} onChange={(event) => updateDraft(connection.slug, { scopes: event.target.value })} placeholder="Scopes, space separated (optional)" />
                      <select
                        value={draft.authMethod}
                        onChange={(event) => updateDraft(connection.slug, { authMethod: event.target.value as OAuthDraft["authMethod"] })}
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="none">PKCE / public client</option>
                        <option value="client_secret_post">Client secret POST</option>
                        <option value="client_secret_basic">Client secret Basic</option>
                      </select>
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={() => configureOAuth(connection)} disabled={busy === `oauth:${connection.id}`}>
                        {busy === `oauth:${connection.id}` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                        Configure & authorize
                      </Button>
                    </div>
                  </div>
                )}

                {oauthStatus?.last_error && (
                  <div className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{oauthStatus.last_error}</div>
                )}

                {connectionTools.length > 0 && (
                  <div className="mt-4 border-t border-white/10 pt-3">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <Wrench className="h-4 w-4" /> Discovered capabilities
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {connectionTools.slice(0, 8).map((tool) => (
                        <div key={tool.id} className="rounded-lg border border-white/10 px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-medium">{tool.remote_name}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] ${tool.risk === "safe" ? "bg-emerald-500/10 text-emerald-500" : tool.risk === "medium" ? "bg-amber-500/10 text-amber-500" : "bg-destructive/10 text-destructive"}`}>
                              {tool.effect} · {tool.risk}
                            </span>
                          </div>
                          {tool.description && <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{tool.description}</div>}
                        </div>
                      ))}
                    </div>
                    {connectionTools.length > 8 && <div className="mt-2 text-xs text-muted-foreground">+{connectionTools.length - 8} more tools registered</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-primary/5 p-3 text-xs text-muted-foreground">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        MCP expands capability, not authority. High-risk or external actions still go through the assistant's normal policy and approval controls.
      </div>
    </div>
  );
};

export default MCPConnectionsPanel;
