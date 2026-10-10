/**
 * Records what happened in this browser tab, so "Report an issue" can attach
 * it: console messages and uncaught errors, API calls (with Encore's trace id
 * when the server sent one), page changes, and the ids of events already sent
 * to Sentry. Everything stays in memory, in small rolling buffers, and only
 * leaves the browser when the user files a report.
 *
 * Installed once from instrumentation.client.ts. Credentials are scrubbed as
 * entries are recorded (and again on the server).
 */

const LIMITS = { console: 300, network: 150, navigation: 50, sentry: 20 };

const buffers = { console: [], network: [], navigation: [], sentry: [] };
let installed = false;

const push = (list, entry, max) => {
  list.push(entry);
  if (list.length > max) list.splice(0, list.length - max);
};

const now = () => new Date().toISOString();

/** Scrub tokens, passwords and one-time codes from text before it is kept. */
export function scrub(text) {
  return String(text ?? '')
    .replace(/(bearer\s+)[A-Za-z0-9._~+/=-]{12,}/gi, '$1[redacted]')
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/g, '[jwt]')
    .replace(
      /((?:password|passcode|secret|token|api[-_]?key|otp|code)["']?\s*[:=]\s*["']?)[^"'&\s,}]{4,}/gi,
      '$1[redacted]'
    )
    .replace(
      /([?&](?:token|code|key|sig|signature|access_token|refresh_token)=)[^&\s#]+/gi,
      '$1[redacted]'
    );
}

const stringify = (value) => {
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, (k, v) => (typeof v === 'bigint' ? String(v) : v)).slice(0, 1000);
  } catch {
    return String(value);
  }
};

function recordConsole(level, args) {
  const err = args.find((a) => a instanceof Error);
  push(
    buffers.console,
    {
      level,
      time: now(),
      message: scrub(args.map(stringify).join(' ')).slice(0, 2000),
      ...(err?.stack ? { stack: scrub(err.stack).slice(0, 4000) } : {}),
    },
    LIMITS.console
  );
}

/** Keep the path and query of a URL (scrubbed), dropping the host for same-origin calls. */
function cleanUrl(url) {
  try {
    const u = new URL(url, window.location.origin);
    const shown =
      u.origin === window.location.origin
        ? `${u.pathname}${u.search}`
        : `${u.host}${u.pathname}${u.search}`;
    return scrub(shown).slice(0, 500);
  } catch {
    return scrub(String(url)).slice(0, 500);
  }
}

/** Record one API call. Successful calls are kept briefly too: they show what led up to a failure. */
export function recordRequest({ method, url, status, durationMs, traceId, error }) {
  push(
    buffers.network,
    {
      time: now(),
      method: String(method || 'GET').toUpperCase(),
      url: cleanUrl(url),
      status: Number(status) || 0,
      durationMs: Math.round(durationMs || 0),
      ...(traceId ? { traceId: String(traceId) } : {}),
      ...(error ? { error: scrub(error).slice(0, 1000) } : {}),
    },
    LIMITS.network
  );
}

const errorMessageOf = (data) => {
  if (!data) return '';
  if (typeof data === 'string') return data.slice(0, 500);
  return data.message || data.error || data.detail || '';
};

/** Watch an axios instance (the shared clients call this). */
export function trackAxios(instance) {
  if (!instance || instance.__diagnosticsTracked) return;

  instance.__diagnosticsTracked = true;
  instance.interceptors.request.use((config) => {
    config.__startedAt = performance.now();
    return config;
  });
  const done = (response, error) => {
    const config = (response || error?.response || error)?.config || error?.config || {};
    const res = response || error?.response;
    const base = config.baseURL && !/^https?:/i.test(config.url || '') ? config.baseURL : '';
    recordRequest({
      method: config.method,
      url: `${base}${config.url || ''}`,
      status: res?.status ?? 0,
      durationMs: config.__startedAt ? performance.now() - config.__startedAt : 0,
      traceId: res?.headers?.['x-encore-trace-id'],
      error: error ? errorMessageOf(res?.data) || error.message : undefined,
    });
  };
  instance.interceptors.response.use(
    (response) => {
      done(response);
      return response;
    },
    (error) => {
      done(null, error);
      return Promise.reject(error);
    }
  );
}

function wrapFetch() {
  const original = window.fetch;
  if (!original || original.__diagnosticsWrapped) return;
  const wrapped = async (input, init) => {
    const started = performance.now();
    const url = typeof input === 'string' ? input : input?.url;
    const method = init?.method || (typeof input === 'object' && input?.method) || 'GET';
    // Static assets and Sentry's own traffic are noise.
    const skip =
      /\/_next\/|\.(?:js|css|png|jpe?g|svg|webp|woff2?)(?:\?|$)|sentry\.io|ingest\./i.test(
        url || ''
      );
    try {
      const res = await original(input, init);
      if (!skip) {
        let error;
        if (!res.ok) {
          try {
            error = errorMessageOf(await res.clone().json());
          } catch {
            error = res.statusText;
          }
        }
        recordRequest({
          method,
          url,
          status: res.status,
          durationMs: performance.now() - started,
          traceId: res.headers.get('x-encore-trace-id') || undefined,
          error,
        });
      }
      return res;
    } catch (err) {
      if (!skip)
        recordRequest({
          method,
          url,
          status: 0,
          durationMs: performance.now() - started,
          error: err?.message,
        });
      throw err;
    }
  };
  wrapped.__diagnosticsWrapped = true;
  window.fetch = wrapped;
}

function watchNavigation() {
  const record = () =>
    push(
      buffers.navigation,
      { time: now(), path: cleanUrl(window.location.href) },
      LIMITS.navigation
    );
  record();
  ['pushState', 'replaceState'].forEach((name) => {
    const original = window.history[name];
    window.history[name] = function patched(...args) {
      const result = original.apply(this, args);
      record();
      return result;
    };
  });
  window.addEventListener('popstate', record);
}

/** Called from Sentry's beforeSend: remember which events this tab sent. */
export function recordSentryEvent(eventId) {
  if (eventId) push(buffers.sentry, String(eventId), LIMITS.sentry);
}

export function installDiagnosticsRecorder() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  ['error', 'warn', 'info', 'log'].forEach((level) => {
    const original = console[level];

    console[level] = (...args) => {
      try {
        recordConsole(level, args);
      } catch {
        // never break logging
      }
      original.apply(console, args);
    };
  });
  window.addEventListener('error', (e) =>
    recordConsole('error', [e.error || `${e.message} (${e.filename}:${e.lineno})`])
  );
  window.addEventListener('unhandledrejection', (e) =>
    recordConsole('error', ['Unhandled promise rejection:', e.reason])
  );
  wrapFetch();
  watchNavigation();
}

/** Everything recorded so far, for a report. */
export function diagnosticsSnapshot() {
  return {
    consoleLogs: [...buffers.console],
    networkLogs: [...buffers.network],
    navigation: [...buffers.navigation],
    sentryEventIds: [...buffers.sentry],
  };
}
