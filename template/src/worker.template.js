const ARGO_TEST_R2_KEY = "argo-test/payload-64k.bin";
const ARGO_TEST_CACHE_CONTROL = "no-store, no-cache, max-age=0";
const ARGO_TEST_ORIGIN_TIMEOUT_MS = 15_000;
const APP_HTML = __APP_HTML_JSON__;

export default {
  async fetch(request, env) {
    try {
      return await route(request, env);
    } catch {
      return new Response("잠시 문제가 생겼어요.", {
        status: 500,
        headers: {
          ...securityHeaders(),
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }
  },
};

async function route(request, env) {
  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname === "/__argo-test/r2") {
    if (!validArgoTestToken(request, env)) return argoTestError(403);
    return argoTestR2(env);
  }

  if (request.method === "GET" && url.pathname === "/__argo-test/external") {
    if (!validArgoTestToken(request, env)) return argoTestError(403);
    return argoTestExternal(url, env);
  }

  if (request.method === "GET" && url.pathname === "/") return appPage();
  if (request.method === "GET" && url.pathname === "/health") {
    return new Response("ok", {
      headers: {
        ...securityHeaders(),
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  return new Response("Not found", { status: 404, headers: securityHeaders() });
}

function validArgoTestToken(request, env) {
  const expected = typeof env.ARGO_TEST_TOKEN === "string" ? env.ARGO_TEST_TOKEN : "";
  const provided = request.headers.get("x-argo-test-token") || "";
  if (!expected || !provided) return false;

  const expectedBytes = new TextEncoder().encode(expected);
  const providedBytes = new TextEncoder().encode(provided);
  const length = Math.max(expectedBytes.length, providedBytes.length);
  let difference = expectedBytes.length ^ providedBytes.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (expectedBytes[index] || 0) ^ (providedBytes[index] || 0);
  }
  return difference === 0;
}

async function argoTestR2(env) {
  const object = await env.STORAGE.get(ARGO_TEST_R2_KEY);
  if (!object) return argoTestError(404);

  const headers = argoTestHeaders("r2");
  if (object.httpMetadata?.contentType) headers.set("Content-Type", object.httpMetadata.contentType);
  if (Number.isSafeInteger(object.size) && object.size >= 0) {
    headers.set("Content-Length", String(object.size));
  }
  return new Response(object.body, { status: 200, headers });
}

async function argoTestExternal(requestUrl, env) {
  if (typeof env.ARGO_TEST_ORIGIN_URL !== "string" || !env.ARGO_TEST_ORIGIN_URL) {
    return argoTestError(502);
  }

  let originUrl;
  try {
    originUrl = new URL(env.ARGO_TEST_ORIGIN_URL);
  } catch {
    return argoTestError(502);
  }
  if (!["https:", "http:"].includes(originUrl.protocol)) return argoTestError(502);

  originUrl.search = "";
  const run = requestUrl.searchParams.get("run");
  if (run !== null) originUrl.searchParams.set("run", run);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ARGO_TEST_ORIGIN_TIMEOUT_MS);
  let upstream;
  try {
    upstream = await fetch(originUrl.toString(), {
      method: "GET",
      headers: { "Accept-Encoding": "identity" },
      cache: "no-store",
      redirect: "manual",
      signal: controller.signal,
    });
  } catch {
    return argoTestError(controller.signal.aborted ? 504 : 502);
  } finally {
    clearTimeout(timeout);
  }

  if (upstream.status >= 300 && upstream.status < 400) return argoTestError(502);
  if (upstream.status !== 200) return argoTestError(502);

  const headers = argoTestHeaders("external");
  const contentType = upstream.headers.get("Content-Type");
  const contentLength = upstream.headers.get("Content-Length");
  if (contentType) headers.set("Content-Type", contentType);
  if (contentLength && /^\d+$/.test(contentLength)) headers.set("Content-Length", contentLength);
  return new Response(upstream.body, { status: 200, headers });
}

function argoTestHeaders(source) {
  return new Headers({
    "X-Argo-Test-Source": source,
    "Cache-Control": ARGO_TEST_CACHE_CONTROL,
    "X-Content-Type-Options": "nosniff",
  });
}

function argoTestError(status) {
  return new Response(status === 403 ? "Forbidden" : "Not available", {
    status,
    headers: {
      "Cache-Control": ARGO_TEST_CACHE_CONTROL,
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function securityHeaders(nonce = "") {
  const scriptSource = nonce ? "'nonce-" + nonce + "'" : "'none'";
  const styleSource = nonce ? "'nonce-" + nonce + "'" : "'none'";
  return {
    "Content-Security-Policy": [
      "default-src 'none'",
      "script-src " + scriptSource,
      "style-src " + styleSource,
      "img-src 'none'",
      "connect-src 'none'",
      "font-src 'none'",
      "media-src 'none'",
      "base-uri 'none'",
      "form-action 'none'",
      "frame-ancestors 'none'",
    ].join("; "),
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  };
}

function appPage() {
  const nonce = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(18)));
  return new Response(APP_HTML.replaceAll("__NONCE__", nonce), {
    headers: {
      ...securityHeaders(nonce),
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
