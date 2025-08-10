import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const execFileAsync = promisify(execFile);

export type VideoMetadata = {
  id: string;
  title: string;
  channel: string;
  uploader?: string;
  view_count?: number;
  upload_date?: string;
  duration?: number;
};

export async function getVideoInfo(url: string): Promise<VideoMetadata> {
  const { stdout } = await execFileAsync("yt-dlp", ["-J", url]);
  const json = JSON.parse(stdout);
  const md: VideoMetadata = {
    id: json.id,
    title: json.title,
    channel: json.channel || json.uploader || json.uploader_id || "",
    uploader: json.uploader,
    view_count: json.view_count,
    upload_date: json.upload_date,
    duration: json.duration,
  };
  return md;
}

export async function extractSubtitles(url: string): Promise<string | null> {
  try {
    const tmp = await mkdtemp(join(tmpdir(), "shorts-analyzer-subs-"));
    const cleanup = async () => {
      try {
        await access(tmp).then(async () => {
          await rm(tmp, { recursive: true, force: true });
        });
      } catch {}
    };

    try {
      // Try to extract subtitles in multiple languages with priority order
      // Priority: auto-generated > manual > any available
      const subtitleArgs = [
        url,
        "--write-subs",
        "--write-auto-subs", 
        "--sub-langs", "en.*,auto,live_chat,-live_chat", // English preference, then auto
        "--skip-download",
        "--no-playlist",
        "-o", join(tmp, "%(title)s.%(ext)s"),
        "--quiet",
        "--no-warnings"
      ];
      
      await execFileAsync("yt-dlp", subtitleArgs);
      
      // List files to find subtitle files
      const { stdout } = await execFileAsync("/bin/ls", ["-la", tmp]);
      const lines = stdout.split("\n").filter(line => line.includes(".vtt") || line.includes(".srt"));
      
      if (lines.length > 0) {
        // Find the best subtitle file (prefer .en.vtt or .en.srt)
        const files = lines.map(line => {
          const parts = line.trim().split(/\s+/);
          return parts[parts.length - 1]; // filename is last part
        }).filter(f => f.endsWith('.vtt') || f.endsWith('.srt'));
        
        // Prefer English subtitles, then auto-generated, then any
        const preferredFile = files.find(f => f.includes('.en.')) || 
                             files.find(f => f.includes('auto')) ||
                             files[0];
        
        if (preferredFile) {
          const { readFile } = await import("node:fs/promises");
          const subtitlePath = join(tmp, preferredFile);
          const content = await readFile(subtitlePath, "utf-8");
          
          // Parse VTT or SRT content to extract text only
          const cleanedContent = parseSubtitleContent(content);
          console.log(`[SUBTITLES] Successfully extracted subtitles from ${preferredFile}`);
          
          await cleanup();
          return cleanedContent;
        }
      }
      
      await cleanup();
      return null;
    } catch (error) {
      await cleanup();
      console.log(`[SUBTITLES] Failed to extract subtitles:`, error);
      return null;
    }
  } catch (error) {
    console.log(`[SUBTITLES] Subtitle extraction setup failed:`, error);
    return null;
  }
}

function parseSubtitleContent(content: string): string {
  // Remove VTT/SRT formatting and extract plain text
  let lines = content.split('\n');
  
  // Filter out metadata, timestamps, and formatting
  const textLines = lines
    .filter(line => {
      const trimmed = line.trim();
      // Skip empty lines
      if (!trimmed) return false;
      // Skip VTT headers
      if (trimmed.startsWith('WEBVTT') || trimmed.startsWith('NOTE')) return false;
      // Skip SRT numbering
      if (/^\d+$/.test(trimmed)) return false;
      // Skip timestamp lines
      if (/\d{2}:\d{2}:\d{2}/.test(trimmed)) return false;
      // Skip style tags
      if (trimmed.startsWith('<') && trimmed.endsWith('>')) return false;
      return true;
    })
    .map(line => {
      // Clean up HTML tags and formatting
      return line
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\[.*?\]/g, '') // Remove [music], [applause] etc
        .replace(/\{.*?\}/g, '') // Remove {style} tags
        .trim();
    })
    .filter(line => line.length > 0);
  
  return textLines.join(' ');
}

export async function downloadAudioAsWav(url: string): Promise<{ wavPath: string; cleanup: () => Promise<void> }> {
  const tmp = await mkdtemp(join(tmpdir(), "shorts-analyzer-"));
  const outTemplate = join(tmp, "%(id)s.%(ext)s");
  // Extract best audio to wav using yt-dlp + ffmpeg (ffmpeg is used internally by yt-dlp)
  await execFileAsync("yt-dlp", [
    url,
    "-x",
    "--audio-format",
    "wav",
    "-o",
    outTemplate,
    "--no-playlist",
    "--quiet",
    "--no-warnings",
  ]);

  // We don't know the id yet reliably here; list directory and find .wav
  const { stdout } = await execFileAsync("/bin/ls", [tmp]);
  const wav = stdout
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.endsWith(".wav"))[0];
  if (!wav) throw new Error("Failed to locate downloaded wav file");
  const wavPath = join(tmp, wav);

  const cleanup = async () => {
    try {
      await access(tmp).then(async () => {
        await rm(tmp, { recursive: true, force: true });
      });
    } catch {}
  };

  return { wavPath, cleanup };
}
