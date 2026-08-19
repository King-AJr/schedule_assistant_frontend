type PostHogLike = Array<unknown> & {
  init?: (key: string, config: Record<string, unknown>) => void;
  capture?: (event: string, properties?: Record<string, unknown>) => void;
  identify?: (distinctId: string, properties?: Record<string, unknown>) => void;
  reset?: () => void;
  get_session_id?: () => string;
  startSessionRecording?: () => void;
};

declare global {
  interface Window {
    posthog?: PostHogLike;
    __eaObservedFetchInstalled?: boolean;
  }
}

const SESSION_HEADER = "X-EA-Session-ID";
const MAX_ERROR = 500;

function posthogHost(): string {
  return (import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com").replace(/\/$/, "");
}

function installPostHogLoader(host: string): PostHogLike {
  if (window.posthog) return window.posthog;

  const queue = [] as unknown as PostHogLike;
  const methods = [
    "capture",
    "identify",
    "reset",
    "get_session_id",
    "startSessionRecording",
  ];
  for (const method of methods) {
    (queue as unknown as Record<string, unknown>)[method] = (...args: unknown[]) => {
      queue.push([method, ...args]);
    };
  }
  window.posthog = queue;

  const script = document.createElement("script");
  script.async = true;
  script.crossOrigin = "anonymous";
  script.src = `${host.replace(".i.posthog.com", "-assets.i.posthog.com")}/static/array.js`;
  document.head.appendChild(script);
  return queue;
}

export function getReplaySessionId(): string | null {
  try {
    const value = window.posthog?.get_session_id?.();
    return typeof value === "string" && value.length > 0 && value.length <= 200 ? value : null;
  } catch {
    return null;
  }
}

function identifyStoredUser(): void {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return;
    const user = JSON.parse(raw) as { id?: unknown };
    if (typeof user.id === "string" && user.id) {
      window.posthog?.identify?.(user.id);
    }
  } catch {
    // Observability is never allowed to break the application.
  }
}

function captureFrontendError(kind: string, value: unknown): void {
  const message = value instanceof Error ? value.message : String(value ?? "unknown");
  window.posthog?.capture?.("ea_frontend_error", {
    kind,
    message: message.slice(0, MAX_ERROR),
    path: window.location.pathname,
  });
}

export function initBrowserObservability(): void {
  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  if (!key) return;

  const host = posthogHost();
  const posthog = installPostHogLoader(host);
  posthog.init = posthog.init || ((...args: unknown[]) => posthog.push(["init", ...args]));
  posthog.init(key, {
    api_host: host,
    person_profiles: "identified_only",
    capture_pageview: true,
    capture_pageleave: true,
    disable_session_recording: false,
    // Inputs are always masked. Masking all page text defaults on and can only
    // be relaxed deliberately for a controlled debugging environment.
    mask_all_text: import.meta.env.VITE_POSTHOG_MASK_ALL_TEXT !== "false",
    session_recording: {
      maskAllInputs: true,
    },
  });
  posthog.startSessionRecording?.();
  identifyStoredUser();

  window.addEventListener("error", (event) => captureFrontendError("window_error", event.error || event.message));
  window.addEventListener("unhandledrejection", (event) => captureFrontendError("unhandled_rejection", event.reason));
}

function apiOrigin(): string | null {
  const configured = import.meta.env.VITE_API_URL as string | undefined;
  if (!configured) return null;
  try {
    return new URL(configured, window.location.origin).origin;
  } catch {
    return null;
  }
}

function requestUrl(input: RequestInfo | URL): URL | null {
  try {
    if (input instanceof Request) return new URL(input.url, window.location.origin);
    return new URL(String(input), window.location.origin);
  } catch {
    return null;
  }
}

async function updateIdentityFromResponse(url: URL, response: Response): Promise<void> {
  try {
    if (!response.ok) return;
    if (url.pathname.endsWith("/auth/logout")) {
      window.posthog?.reset?.();
      return;
    }
    if (!url.pathname.endsWith("/auth/login") && !url.pathname.endsWith("/auth/validate")) return;
    const data = await response.clone().json();
    const id = data?.user_id ?? data?.user?.id;
    if (typeof id === "string" && id) window.posthog?.identify?.(id);
  } catch {
    // Identity enrichment is optional and must not affect auth/network behavior.
  }
}

export function installObservedFetch(): void {
  if (window.__eaObservedFetchInstalled) return;
  window.__eaObservedFetchInstalled = true;

  const targetOrigin = apiOrigin();
  if (!targetOrigin) return;
  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = requestUrl(input);
    if (!url || url.origin !== targetOrigin) return nativeFetch(input, init);

    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
    const sessionId = getReplaySessionId();
    if (sessionId) headers.set(SESSION_HEADER, sessionId);

    const started = performance.now();
    try {
      const response = await nativeFetch(input, { ...init, headers });
      window.posthog?.capture?.("ea_api_request", {
        path: url.pathname,
        method: init?.method || (input instanceof Request ? input.method : "GET"),
        status: response.status,
        duration_ms: Math.round(performance.now() - started),
      });
      void updateIdentityFromResponse(url, response);
      return response;
    } catch (error) {
      window.posthog?.capture?.("ea_api_request_failed", {
        path: url.pathname,
        method: init?.method || (input instanceof Request ? input.method : "GET"),
        duration_ms: Math.round(performance.now() - started),
        error_class: error instanceof Error ? error.name : "unknown",
      });
      throw error;
    }
  };
}
