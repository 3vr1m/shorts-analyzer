import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

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
  const { stdout } = await execFileAsync("yt-dlp", ["--flat-playlist", "--dump-json", searchArg]);
  const lines = stdout.split("\n").filter(Boolean);
  const ids: string[] = [];
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      const id = obj.id || obj.url || obj.webpage_url_basename || null;
      if (id) ids.push(String(id));
    } catch {}
  }

  // 2) Hydrate per ID (limit and rate limit)
  const results: any[] = [];
  for (const id of ids.slice(0, max * 2)) {
    try {
      const url = `https://www.youtube.com/watch?v=${id}`;
      const { stdout: j } = await execFileAsync("yt-dlp", ["-J", url]);
      const data = JSON.parse(j);
      const seconds = Number(data.duration || 0);
      if (duration === "short" && seconds > 60) continue;
      if (duration === "medium" && !(seconds > 60 && seconds <= 1200)) continue;
      if (duration === "long" && seconds <= 1200) continue;
      results.push({
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
      if (results.length >= max) break;
      await sleep(200); // Reduced from 500ms for better performance
    } catch {
      // ignore individual failures
      await sleep(100); // Reduced from 300ms for better performance
    }
  }

  // Sort by a simple velocity proxy: views (descending)
  results.sort((a, b) => (b.views || 0) - (a.views || 0));
  return results.slice(0, max);
}
