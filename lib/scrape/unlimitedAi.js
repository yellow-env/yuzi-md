import https from "https";
import crypto from "crypto";
import fs from "fs";
import botConfig from "../../config/bot.config.js";

const BASE_HOST = "chat.chatex.ai";
const BASE_ORIGIN = "https://chat.chatex.ai";
const DEFAULT_MODEL = "openai/gpt-5.5";
const RELEASE = "9a4a53f75b15b69a537a88aa2a105e61aeaf6ef1";

class CookieJar {
  constructor() {
    this._store = new Map();
  }

  ingest(rawHeaders) {
    const setCookies = Array.isArray(rawHeaders) ? rawHeaders : [rawHeaders];
    for (const raw of setCookies) {
      if (!raw) continue;
      const [nameVal, ...attrs] = raw.split(";").map((s) => s.trim());
      const eqIdx = nameVal.indexOf("=");
      if (eqIdx === -1) continue;
      const name = nameVal.slice(0, eqIdx).trim();
      const value = nameVal.slice(eqIdx + 1).trim();
      const meta = {
        value,
        httpOnly: false,
        secure: false,
        sameSite: "lax",
        path: "/",
        domain: BASE_HOST,
      };
      for (const attr of attrs) {
        const lower = attr.toLowerCase();
        if (lower === "httponly") meta.httpOnly = true;
        else if (lower === "secure") meta.secure = true;
        else if (lower.startsWith("samesite="))
          meta.sameSite = attr.split("=")[1].toLowerCase();
        else if (lower.startsWith("path=")) meta.path = attr.split("=")[1];
        else if (lower.startsWith("domain="))
          meta.domain = attr.split("=")[1].replace(/^\./, "");
        else if (lower.startsWith("expires="))
          meta.expires = new Date(attr.slice(8));
        else if (lower.startsWith("max-age="))
          meta.maxAge = parseInt(attr.slice(8), 10);
      }
      this._store.set(name, meta);
    }
  }

  serialize() {
    const parts = [];
    for (const [name, meta] of this._store) {
      if (meta.expires && meta.expires < new Date()) continue;
      parts.push(`${name}=${meta.value}`);
    }
    return parts.join("; ");
  }

  toObject() {
    const out = {};
    for (const [name, meta] of this._store) {
      out[name] = {
        value: meta.value,
        httpOnly: meta.httpOnly,
        secure: meta.secure,
        sameSite: meta.sameSite,
        path: meta.path,
        domain: meta.domain,
        expires: meta.expires ? meta.expires.toISOString() : null,
      };
    }
    return out;
  }

  get(name) {
    return this._store.get(name)?.value ?? null;
  }
}

function buildSentryHeaders(traceId) {
  const spanId = crypto.randomBytes(8).toString("hex");
  return {
    "sentry-trace": `${traceId}-${spanId}-0`,
    baggage: [
      "sentry-environment=production",
      `sentry-release=${RELEASE}`,
      "sentry-public_key=880e3505fa2495c8dd95c43f87c2e15c",
      `sentry-trace_id=${traceId}`,
      "sentry-org_id=4507661611630592",
      "sentry-transaction=%2F%3Alocale",
      "sentry-sampled=false",
      "sentry-sample_rand=0.5168182909300654",
      "sentry-sample_rate=0.1",
    ].join(","),
  };
}

function buildCommonHeaders(cookieJar, traceId, extra = {}) {
  return {
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    Referer: BASE_ORIGIN + "/en",
    Origin: BASE_ORIGIN,
    Cookie: cookieJar.serialize(),
    ...buildSentryHeaders(traceId),
    ...extra,
  };
}

function httpsRequest(opts, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(opts, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve({ statusCode: res.statusCode, headers: res.headers, raw });
      });
      res.on("error", reject);
    });
    req.on("error", reject);
    req.setTimeout(30000, () => {
      req.destroy(new Error("Request timeout"));
    });
    if (body) req.write(body);
    req.end();
  });
}

function sseRequest(opts, body, onEvent) {
  return new Promise((resolve, reject) => {
    const events = [];
    const req = https.request(opts, (res) => {
      let buf = "";
      res.on("data", (chunk) => {
        buf += chunk.toString("utf8");
        const lines = buf.split("\n");
        buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload);
            events.push(parsed);
            if (onEvent) onEvent(parsed);
          } catch (_) {}
        }
      });
      res.on("end", () =>
        resolve({ statusCode: res.statusCode, headers: res.headers, events }),
      );
      res.on("error", reject);
    });
    req.on("error", reject);
    req.setTimeout(60000, () => {
      req.destroy(new Error("SSE timeout"));
    });
    if (body) req.write(body);
    req.end();
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Rate limiter to prevent too many requests
class RateLimiter {
  constructor(minIntervalMs = 2000) {
    this.minIntervalMs = minIntervalMs;
    this.lastRequestTime = 0;
  }

  async throttle() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minIntervalMs) {
      const waitTime = this.minIntervalMs - timeSinceLastRequest;
      await sleep(waitTime);
    }
    this.lastRequestTime = Date.now();
  }
}

const rateLimiter = new RateLimiter(2000);

async function initSession(cookieJar, traceId) {
  const opts = {
    hostname: BASE_HOST,
    path: "/en",
    method: "GET",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
    },
  };

  const res = await httpsRequest(opts, null);

  if (res.headers["set-cookie"]) {
    cookieJar.ingest(res.headers["set-cookie"]);
  }

  return {
    endpoint: `${BASE_ORIGIN}/en`,
    method: "GET",
    statusCode: res.statusCode,
    cookiesReceived: res.headers["set-cookie"] || [],
    contentLength: res.raw.length,
  };
}

async function getAuthSession(cookieJar, traceId) {
  const opts = {
    hostname: BASE_HOST,
    path: "/api/auth/get-session",
    method: "GET",
    headers: buildCommonHeaders(cookieJar, traceId),
  };

  const res = await httpsRequest(opts, null);
  if (res.headers["set-cookie"]) cookieJar.ingest(res.headers["set-cookie"]);

  let parsed = null;
  try {
    parsed = JSON.parse(res.raw);
  } catch (_) {}

  return {
    endpoint: `${BASE_ORIGIN}/api/auth/get-session`,
    method: "GET",
    statusCode: res.statusCode,
    contentType: res.headers["content-type"] ?? null,
    vercelCache: res.headers["x-vercel-cache"] ?? null,
    session: parsed,
    isAuthenticated:
      parsed !== null && typeof parsed === "object" && "user" in parsed,
  };
}

async function getGeoCurrency(cookieJar, traceId) {
  const opts = {
    hostname: BASE_HOST,
    path: "/api/geo/currency",
    method: "GET",
    headers: buildCommonHeaders(cookieJar, traceId, {
      Accept: "application/json",
    }),
  };

  const res = await httpsRequest(opts, null);
  if (res.headers["set-cookie"]) cookieJar.ingest(res.headers["set-cookie"]);

  let parsed = null;
  try {
    parsed = JSON.parse(res.raw);
  } catch (_) {}

  return {
    endpoint: `${BASE_ORIGIN}/api/geo/currency`,
    method: "GET",
    statusCode: res.statusCode,
    contentType: res.headers["content-type"] ?? null,
    geo: parsed,
  };
}

async function registerFingerprint(cookieJar, traceId) {
  const fpid = crypto
    .createHash("md5")
    .update(crypto.randomBytes(32))
    .digest("hex");

  const payload = JSON.stringify({
    fpid,
    confidence: 0.4,
    version: "5.0.1",
  });

  const opts = {
    hostname: BASE_HOST,
    path: "/api/v/fingerprint",
    method: "POST",
    headers: {
      ...buildCommonHeaders(cookieJar, traceId),
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
    },
  };

  const res = await httpsRequest(opts, payload);
  if (res.headers["set-cookie"]) cookieJar.ingest(res.headers["set-cookie"]);

  return {
    endpoint: `${BASE_ORIGIN}/api/v/fingerprint`,
    method: "POST",
    statusCode: res.statusCode,
    fpid,
    registered: res.statusCode === 204,
  };
}

function parseSSEEvents(events) {
  const result = {
    messageId: null,
    model: null,
    fullText: "",
    textDeltas: [],
    providerMetadata: null,
    usage: null,
    finishReason: null,
    steps: [],
    rawEventCount: events.length,
    eventTypes: {},
  };

  let currentStep = { deltas: [], metadata: null };

  for (const ev of events) {
    const t = ev.type;
    result.eventTypes[t] = (result.eventTypes[t] || 0) + 1;

    switch (t) {
      case "start":
        result.messageId = ev.messageId;
        break;
      case "start-step":
        currentStep = { deltas: [], metadata: null };
        break;
      case "text-start":
        currentStep.metadata = ev.providerMetadata ?? null;
        break;
      case "text-delta":
        result.textDeltas.push(ev.delta);
        result.fullText += ev.delta;
        currentStep.deltas.push(ev.delta);
        break;
      case "text-end":
        currentStep.endMetadata = ev.providerMetadata ?? null;
        break;
      case "finish-step":
        result.steps.push({ ...currentStep });
        currentStep = { deltas: [], metadata: null };
        break;
      case "finish":
        result.finishReason = ev.finishReason;
        break;
      case "data-usage":
        result.usage = ev.data ?? null;
        if (ev.data?.modelId) result.model = ev.data.modelId;
        break;
      default:
        break;
    }
  }

  return result;
}

async function sendChat(
  cookieJar,
  traceId,
  userMessage,
  model,
  chatId,
  messageId,
) {
  const isExistingChat = false;

  const payload = JSON.stringify({
    id: chatId,
    message: {
      role: "user",
      parts: [{ type: "text", text: userMessage }],
      id: messageId,
    },
    selectedChatModel: model,
    selectedVisibilityType: "private",
    webSearchEnabled: false,
    imageGenerationEnabled: false,
    isExistingChat,
  });

  const opts = {
    hostname: BASE_HOST,
    path: "/api/chat",
    method: "POST",
    headers: {
      ...buildCommonHeaders(cookieJar, traceId),
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
      Accept: "text/event-stream",
      "Cache-Control": "no-cache",
    },
  };

  const rawEvents = [];
  const res = await sseRequest(opts, payload, (ev) => rawEvents.push(ev));

  if (res.headers["set-cookie"]) cookieJar.ingest(res.headers["set-cookie"]);

  const parsed = parseSSEEvents(rawEvents);

  return {
    endpoint: `${BASE_ORIGIN}/api/chat`,
    method: "POST",
    statusCode: res.statusCode,
    contentType: res.headers["content-type"] ?? null,
    vercelAiStream: res.headers["x-vercel-ai-ui-message-stream"] ?? null,
    vercelId: res.headers["x-vercel-id"] ?? null,
    requestPayload: {
      chatId,
      messageId,
      message: userMessage,
      model,
      webSearchEnabled: false,
      imageGenerationEnabled: false,
      isExistingChat,
    },
    response: parsed,
    rawEventCount: rawEvents.length,
  };
}

async function getVotes(cookieJar, traceId, chatId) {
  const qs = new URLSearchParams({ chatId }).toString();
  const opts = {
    hostname: BASE_HOST,
    path: `/api/vote?${qs}`,
    method: "GET",
    headers: buildCommonHeaders(cookieJar, traceId),
  };

  const res = await httpsRequest(opts, null);
  if (res.headers["set-cookie"]) cookieJar.ingest(res.headers["set-cookie"]);

  let parsed = null;
  try {
    parsed = JSON.parse(res.raw);
  } catch (_) {}

  return {
    endpoint: `${BASE_ORIGIN}/api/vote`,
    method: "GET",
    statusCode: res.statusCode,
    contentType: res.headers["content-type"] ?? null,
    chatId,
    votes: parsed,
    voteCount: Array.isArray(parsed) ? parsed.length : null,
  };
}

async function Chatex(userMessage, model) {
  const startedAt = new Date().toISOString();
  const traceId = crypto.randomBytes(16).toString("hex");
  const chatId = crypto.randomUUID();
  const messageId = crypto.randomUUID();
  const cookieJar = new CookieJar();
  const timeline = [];
  const errors = [];

  function record(label, data) {
    timeline.push({
      step: label,
      completedAt: new Date().toISOString(),
      ...data,
    });
  }

  // Rate limit: wait between requests
  await rateLimiter.throttle();

  const MAX_RETRIES = 3;
  
  async function executeWithRetry(fn, label, retryCount = 0) {
    try {
      const result = await fn();
      
      // Check for 429 status code and retry with exponential backoff
      if (result && result.statusCode === 429 && retryCount < MAX_RETRIES) {
        const backoffMs = Math.pow(2, retryCount) * 3000 + Math.random() * 1000;
        console.log(`[Rate Limit] ${label} returned 429, retrying in ${Math.round(backoffMs)}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        await sleep(backoffMs);
        // Get fresh cookies for retry
        const freshCookieJar = new CookieJar();
        await initSession(freshCookieJar, crypto.randomBytes(16).toString("hex"));
        await sleep(500);
        return executeWithRetry(fn, label, retryCount + 1);
      }
      
      record(label, result);
      return result;
    } catch (e) {
      errors.push({ step: label, message: e.message });
      // Retry on network errors with exponential backoff (only for certain steps)
      if (retryCount < MAX_RETRIES && ["init_session", "auth_session", "send_chat"].includes(label)) {
        const backoffMs = Math.pow(2, retryCount) * 2000 + Math.random() * 1000;
        console.log(`[Retry] ${label} failed, retrying in ${Math.round(backoffMs)}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        await sleep(backoffMs);
        return executeWithRetry(fn, label, retryCount + 1);
      }
      throw e;
    }
  }

  let sessionResult = null;
  try {
    sessionResult = await executeWithRetry(
      () => initSession(cookieJar, traceId),
      "init_session"
    );
  } catch (e) {
    errors.push({ step: "init_session", message: e.message });
  }

  await sleep(200);

  let authResult = null;
  try {
    authResult = await executeWithRetry(
      () => getAuthSession(cookieJar, traceId),
      "auth_session"
    );
  } catch (e) {
    errors.push({ step: "auth_session", message: e.message });
  }

  let geoResult = null;
  try {
    geoResult = await executeWithRetry(
      () => getGeoCurrency(cookieJar, traceId),
      "geo_currency"
    );
  } catch (e) {
    errors.push({ step: "geo_currency", message: e.message });
  }

  await sleep(300);

  let fpResult = null;
  try {
    fpResult = await executeWithRetry(
      () => registerFingerprint(cookieJar, traceId),
      "fingerprint"
    );
  } catch (e) {
    errors.push({ step: "fingerprint", message: e.message });
  }

  await sleep(400);

  let chatResult = null;
  try {
    chatResult = await executeWithRetry(
      () => sendChat(cookieJar, traceId, userMessage, model, chatId, messageId),
      "send_chat"
    );
  } catch (e) {
    errors.push({ step: "send_chat", message: e.message });
  }

  await sleep(150);

  let voteResult = null;
  try {
    voteResult = await getVotes(cookieJar, traceId, chatId);
    record("get_votes", voteResult);
  } catch (e) {
    errors.push({ step: "get_votes", message: e.message });
  }

  const finishedAt = new Date().toISOString();
  const durationMs = new Date(finishedAt) - new Date(startedAt);

  return {
    session: {
      chatId,
      messageId,
      model: model ?? DEFAULT_MODEL,
      isAnonymous: authResult ? !authResult.isAuthenticated : null,
      cookies: cookieJar.toObject(),
      geo: geoResult?.geo ?? null,
    },
    request: {
      userMessage,
      model,
    },
    response: chatResult
      ? {
          messageId: chatResult.response.messageId,
          model: chatResult.response.model,
          text: chatResult.response.fullText,
          finishReason: chatResult.response.finishReason,
          usage: chatResult.response.usage,
          steps: chatResult.response.steps,
          streaming: {
            rawEventCount: chatResult.rawEventCount,
            eventTypes: chatResult.response.eventTypes,
            textDeltas: chatResult.response.textDeltas,
          },
          http: {
            statusCode: chatResult.statusCode,
            contentType: chatResult.contentType,
            vercelId: chatResult.vercelId,
            vercelAiStream: chatResult.vercelAiStream,
          },
        }
      : null,
  };
}

const PERSONAS = {
  persona1: {
    name: "AI Assistant",
    tone: "professional and helpful",
    description: "Standard assistant for general queries",
  },
  persona2: {
    name: "Expert AI",
    tone: "advanced and technical",
    description: "Advanced mode for owners with deeper expertise",
  },
};

function buildPrompt(message, personaType, context) {
  const persona = PERSONAS[personaType];

  let systemPrompt = `You are ${persona.name}, an AI assistant with a ${persona.tone} tone.\n\n`;

  if (personaType === "persona1") {
    systemPrompt += `You are responding in a WhatsApp chat context. Provide clear, concise, and helpful responses. Keep your answers friendly and informative.\n\n`;
  } else {
    systemPrompt += `You are responding to the owner/superuser in a private context. Provide detailed, technical, and comprehensive responses. Show advanced insights and analysis.\n\n`;
  }

  if (context) {
    systemPrompt += `Context: ${context}\n\n`;
  }

  systemPrompt += `User message: ${message}\n\nResponse:`;

  return systemPrompt;
}

export { buildPrompt, Chatex, DEFAULT_MODEL };
