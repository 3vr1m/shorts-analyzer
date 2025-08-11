import youtubeDl from "youtube-dl-exec";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function ytSearchAndHydrate(opts: {
  niche: string;
  duration: "short" | "medium" | "long";
  max: number;
  country: string;
}) {
  const { niche, duration, max } = opts;
  const query = niche && niche.trim() ? niche.trim() : "trending";

  // 1) Search
  const searchArg = `ytsearch${Math.min(50, Math.max(10, max * 2))}:${query}`;
  const results = await youtubeDl(searchArg, {
    flatPlaylist: true,
    dumpSingleJson: false,
    simulate: true,
    quiet: true,
    noWarnings: true
  });
  
  // youtube-dl-exec returns a Payload object, cast it properly
  const searchResults = Array.isArray(results) ? results : [results];
  const ids: string[] = [];
  for (const obj of searchResults) {
    const item = obj as any;
    const id = item.id || item.url || item.webpage_url_basename || null;
    if (id) ids.push(String(id));
  }

  // 2) Hydrate per ID (limit and rate limit)
  const videoResults: any[] = [];
  for (const id of ids.slice(0, max * 2)) {
    try {
      const url = `https://www.youtube.com/watch?v=${id}`;
      const result = await youtubeDl(url, {
        dumpSingleJson: true,
        noCheckCertificates: true,
        noWarnings: true,
        quiet: true
      });
      const data = result as any;
      const seconds = Number(data.duration || 0);
      if (duration === "short" && seconds > 60) continue;
      if (duration === "medium" && !(seconds > 60 && seconds <= 1200)) continue;
      if (duration === "long" && seconds <= 1200) continue;
      videoResults.push({
        id: data.id,
        url,
        title: data.title,
        channel: data.channel || data.uploader || "",
        publishedAt: data.upload_date ? `${data.upload_date.slice(0,4)}-${data.upload_date.slice(4,6)}-${data.upload_date.slice(6,8)}` : "",
        durationSeconds: seconds,
        views: Number(data.view_count || 0),
        likeCount: Number(data.like_count || 0),
        commentCount: Number(data.comment_count || 0),
        region: "",
      });
      if (videoResults.length >= max) break;
      await sleep(200); // Reduced from 500ms for better performance
    } catch {
      // ignore individual failures
      await sleep(100); // Reduced from 300ms for better performance
    }
  }

  // Sort by a simple velocity proxy: views (descending)
  videoResults.sort((a, b) => (b.views || 0) - (a.views || 0));
  return videoResults.slice(0, max);
}
