import youtubeDl from "youtube-dl-exec";
import { mkdtemp, rm, access, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
  const result = await youtubeDl(url, {
    dumpSingleJson: true,
    noCheckCertificates: true,
    noWarnings: true,
    preferFreeFormats: true,
    addHeader: ["referer:youtube.com", "user-agent:googlebot"]
  });
  
  // youtube-dl-exec returns a Payload object, we need to cast it properly
  const json = result as any;
  
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
      await youtubeDl(url, {
        writeSub: true,
        writeAutoSub: true,
        subLang: "en.*,auto,live_chat,-live_chat", // English preference, then auto
        skipDownload: true,
        noPlaylist: true,
        output: join(tmp, "%(title)s.%(ext)s"),
        quiet: true,
        noWarnings: true
      });
      
      // List files to find subtitle files
      const files = await readdir(tmp);
      const subtitleFiles = files.filter(f => f.endsWith('.vtt') || f.endsWith('.srt'));
      
      if (subtitleFiles.length > 0) {
        
        // Prefer English subtitles, then auto-generated, then any
        const preferredFile = subtitleFiles.find(f => f.includes('.en.')) || 
                             subtitleFiles.find(f => f.includes('auto')) ||
                             subtitleFiles[0];
        
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
  const tmp = await mkdtemp(join(tmpdir(), "shorts-analyzer-audio-"));
  const outTemplate = join(tmp, "%(id)s.%(ext)s");
  
  try {
    // Extract best audio to wav using youtube-dl-exec
    await youtubeDl(url, {
      extractAudio: true,
      audioFormat: "wav",
      output: outTemplate,
      noPlaylist: true,
      quiet: true,
      noWarnings: true
    });

    // Find the downloaded wav file
    const files = await readdir(tmp);
    const wavFile = files.find(f => f.endsWith('.wav'));
    
    if (!wavFile) {
      throw new Error("Failed to locate downloaded wav file");
    }
    
    const wavPath = join(tmp, wavFile);

    const cleanup = async () => {
      try {
        await access(tmp).then(async () => {
          await rm(tmp, { recursive: true, force: true });
        });
      } catch {}
    };

    return { wavPath, cleanup };
  } catch (error) {
    // Clean up temp directory on failure
    try {
      await rm(tmp, { recursive: true, force: true });
    } catch {}
    throw error;
  }
}
