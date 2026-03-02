import { ProxyAgent } from "undici";

export interface TranscriptResult {
  text: string;
  lang: string | null;
}

const WEB_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const INNERTUBE_CLIENTS = [
  {
    name: "WEB_EMBEDDED_PLAYER",
    context: {
      client: { clientName: "WEB_EMBEDDED_PLAYER", clientVersion: "1.20260225.00.00" },
      thirdParty: { embedUrl: "https://www.google.com" },
    },
  },
  {
    name: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
    context: {
      client: { clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER", clientVersion: "2.0" },
      thirdParty: { embedUrl: "https://www.google.com" },
    },
  },
  {
    name: "WEB",
    context: {
      client: { clientName: "WEB", clientVersion: "2.20260225.00.00" },
    },
  },
];

function getDispatcher(): ProxyAgent | undefined {
  const proxy = process.env.YOUTUBE_TRANSCRIPT_PROXY;
  console.log("[yt] proxy:", proxy ? "yes" : "no");
  return proxy ? new ProxyAgent(proxy) : undefined;
}

async function ytFetch(
  url: string,
  opts: RequestInit,
  dispatcher?: ProxyAgent
): Promise<Response> {
  return fetch(url, {
    ...opts,
    ...(dispatcher && { dispatcher }),
  } as RequestInit);
}

function extractVideoId(url: string): string | null {
  const m =
    url.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ??
    url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/) ??
    url.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
  return m?.[1] ?? null;
}

/**
 * Extract ytInitialPlayerResponse from page HTML.
 */
function extractInitialPlayerResponse(html: string): Record<string, unknown> | null {
  const marker = "ytInitialPlayerResponse";
  const idx = html.indexOf(marker);
  if (idx === -1) return null;

  let jsonStart = html.indexOf("{", idx);
  if (jsonStart === -1) return null;

  let depth = 0;
  for (let i = jsonStart; i < html.length; i++) {
    if (html[i] === "{") depth++;
    else if (html[i] === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.substring(jsonStart, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/**
 * Try to get captions from the ytInitialPlayerResponse embedded in the page HTML.
 */
function getCaptionsFromPlayerResponse(
  pr: Record<string, unknown>
): { url: string; lang: string }[] | null {
  const captions = (pr as Record<string, Record<string, unknown>>)?.captions;
  if (!captions) return null;

  const renderer = (captions as Record<string, Record<string, unknown>>)
    ?.playerCaptionsTracklistRenderer;
  if (!renderer) return null;

  const tracks = (renderer as Record<string, unknown[]>)?.captionTracks;
  if (!Array.isArray(tracks) || tracks.length === 0) return null;

  return tracks.map((t) => {
    const track = t as Record<string, unknown>;
    return {
      url: String(track.baseUrl ?? ""),
      lang: String(track.languageCode ?? ""),
    };
  });
}

/**
 * Fetch transcript XML from a timedtext URL and convert to text.
 */
async function fetchTranscriptFromUrl(
  captionUrl: string,
  dispatcher?: ProxyAgent
): Promise<{ text: string; lang: string }> {
  const url = new URL(captionUrl);
  if (!url.searchParams.has("fmt")) url.searchParams.set("fmt", "srv3");

  console.log("[yt] fetching transcript:", url.toString().slice(0, 120));
  const res = await ytFetch(url.toString(), { headers: { "User-Agent": WEB_UA } }, dispatcher);
  const xml = await res.text();

  const texts: string[] = [];
  const regex = /<text[^>]*>([\s\S]*?)<\/text>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const decoded = match[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/<[^>]+>/g, "")
      .trim();
    if (decoded) texts.push(decoded);
  }

  const lang = url.searchParams.get("lang") ?? "";
  return { text: texts.join(" "), lang };
}

/**
 * Try to get captions via the Innertube player API with different clients.
 */
async function tryInnertubeClients(
  videoId: string,
  cookies: string,
  visitorData: string,
  dispatcher?: ProxyAgent
): Promise<{ url: string; lang: string }[] | null> {
  const apiUrl =
    "https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8&prettyPrint=false";

  for (const client of INNERTUBE_CLIENTS) {
    console.log(`[yt] trying innertube client: ${client.name}`);

    const body = JSON.stringify({
      context: {
        ...client.context,
        client: {
          ...client.context.client,
          userAgent: WEB_UA,
          ...(visitorData && { visitorData }),
        },
      },
      videoId,
    });

    try {
      const res = await ytFetch(
        apiUrl,
        {
          method: "POST",
          headers: {
            "User-Agent": WEB_UA,
            "Content-Type": "application/json",
            ...(cookies && { Cookie: cookies }),
          },
          body,
        },
        dispatcher
      );

      const data = await res.json() as Record<string, unknown>;
      const status = (data.playabilityStatus as Record<string, unknown>)?.status;
      console.log(`[yt] ${client.name} → status: ${status}`);

      if (status === "OK") {
        const tracks = getCaptionsFromPlayerResponse(data);
        if (tracks && tracks.length > 0) {
          console.log(`[yt] ${client.name} found ${tracks.length} caption tracks`);
          return tracks;
        }
        console.log(`[yt] ${client.name} status OK but no captions in response`);
      }
    } catch (err) {
      console.error(`[yt] ${client.name} failed:`, err);
    }
  }

  return null;
}

export async function getTranscript(url: string): Promise<TranscriptResult> {
  console.log("[yt] getTranscript:", url);

  const videoId = extractVideoId(url);
  if (!videoId) throw new Error("Invalid YouTube URL.");

  const dispatcher = getDispatcher();

  // Step 1: Fetch the video page to get cookies, visitorData, and try HTML captions.
  console.log("[yt] step 1: fetch video page");
  const pageRes = await ytFetch(
    `https://www.youtube.com/watch?v=${videoId}`,
    { headers: { "User-Agent": WEB_UA, "Accept-Language": "en" } },
    dispatcher
  );

  const cookies = (pageRes.headers.getSetCookie?.() ?? [])
    .map((c) => c.split(";")[0])
    .join("; ");
  console.log("[yt] cookies:", cookies.slice(0, 200));

  const html = await pageRes.text();
  console.log("[yt] page length:", html.length);

  const vdMatch = html.match(/"visitorData"\s*:\s*"([^"]+)"/);
  const visitorData = vdMatch?.[1] ?? "";
  console.log("[yt] visitorData:", visitorData ? visitorData.slice(0, 50) : "none");

  // Step 2: Try to extract captions from embedded ytInitialPlayerResponse.
  console.log("[yt] step 2: parse ytInitialPlayerResponse from HTML");
  const ipr = extractInitialPlayerResponse(html);
  if (ipr) {
    const ps = (ipr.playabilityStatus as Record<string, unknown>)?.status;
    console.log("[yt] HTML player status:", ps);
    const htmlTracks = getCaptionsFromPlayerResponse(ipr);
    if (htmlTracks && htmlTracks.length > 0) {
      console.log("[yt] found captions in HTML!", htmlTracks.length, "tracks");
      const enTrack = htmlTracks.find((t) => t.lang.startsWith("en")) ?? htmlTracks[0];
      const result = await fetchTranscriptFromUrl(enTrack.url, dispatcher);
      if (result.text.trim()) {
        console.log("[yt] success from HTML captions! chars:", result.text.length);
        return { text: result.text, lang: result.lang || enTrack.lang };
      }
    } else {
      console.log("[yt] no captions in HTML player response");
    }
  } else {
    console.log("[yt] could not parse ytInitialPlayerResponse");
  }

  // Step 3: Try Innertube player API with different clients.
  console.log("[yt] step 3: try innertube clients");
  const tracks = await tryInnertubeClients(videoId, cookies, visitorData, dispatcher);

  if (tracks && tracks.length > 0) {
    const enTrack = tracks.find((t) => t.lang.startsWith("en")) ?? tracks[0];
    const result = await fetchTranscriptFromUrl(enTrack.url, dispatcher);
    if (result.text.trim()) {
      console.log("[yt] success from innertube! chars:", result.text.length);
      return { text: result.text, lang: result.lang || enTrack.lang };
    }
  }

  // Step 4: Last resort — try without proxy if proxy was used.
  if (dispatcher) {
    console.log("[yt] step 4: retry innertube WITHOUT proxy");
    const directTracks = await tryInnertubeClients(videoId, cookies, visitorData);
    if (directTracks && directTracks.length > 0) {
      const enTrack = directTracks.find((t) => t.lang.startsWith("en")) ?? directTracks[0];
      const result = await fetchTranscriptFromUrl(enTrack.url);
      if (result.text.trim()) {
        console.log("[yt] success from direct innertube! chars:", result.text.length);
        return { text: result.text, lang: result.lang || enTrack.lang };
      }
    }
  }

  throw new Error(
    "This video doesn't have captions available. Please try a different video."
  );
}
