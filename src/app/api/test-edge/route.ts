export const runtime = "edge";

import { YoutubeTranscript } from "youtube-transcript-plus";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const videoUrl = url.searchParams.get("url");
  if (!videoUrl) {
    return Response.json({ error: "pass ?url=YOUTUBE_URL" });
  }

  try {
    const segments = await YoutubeTranscript.fetchTranscript(videoUrl, { lang: "en" });
    return Response.json({
      success: true,
      count: segments.length,
      preview: segments.map((s) => s.text).join(" ").slice(0, 300),
    });
  } catch (err) {
    return Response.json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
