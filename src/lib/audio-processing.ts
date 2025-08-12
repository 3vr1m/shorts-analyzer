import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdtemp, writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import OpenAI from 'openai';
import { createReadStream } from 'fs';

const execFileAsync = promisify(execFile);

// Initialize OpenAI client
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

export interface AudioResult {
  wavPath: string;
  cleanup: () => Promise<void>;
}

/**
 * Downloads audio from a video URL and converts it to WAV format
 * Uses yt-dlp for video downloading and ffmpeg for audio conversion
 */
export async function downloadAudioAsWav(videoUrl: string): Promise<AudioResult> {
  try {
    // Create temporary directory
    const tempDir = await mkdtemp(join(tmpdir(), 'shorts-analyzer-'));
    const audioPath = join(tempDir, 'audio.wav');
    
    console.log(`[AUDIO] 📁 Created temp directory: ${tempDir}`);
    console.log(`[AUDIO] 🎵 Downloading audio from: ${videoUrl}`);
    
    // Download audio using yt-dlp
    const { stdout, stderr } = await execFileAsync('yt-dlp', [
      '--extract-audio',
      '--audio-format', 'wav',
      '--audio-quality', '0', // Best quality
      '--output', audioPath,
      '--no-playlist',
      '--quiet',
      videoUrl
    ]);
    
    if (stderr) {
      console.log(`[AUDIO] ⚠️ yt-dlp stderr: ${stderr}`);
    }
    
    console.log(`[AUDIO] ✅ Audio downloaded successfully`);
    console.log(`[AUDIO] 📍 Audio file: ${audioPath}`);
    
    // Cleanup function
    const cleanup = async (): Promise<void> => {
      try {
        await unlink(audioPath);
        console.log(`[AUDIO] 🧹 Cleaned up audio file: ${audioPath}`);
      } catch (error) {
        console.error(`[AUDIO] ❌ Cleanup error:`, error);
      }
    };
    
    return {
      wavPath: audioPath,
      cleanup
    };
    
  } catch (error) {
    console.error(`[AUDIO] ❌ Failed to download audio:`, error);
    throw new Error(`Audio download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Transcribes audio file using OpenAI Whisper API
 */
export async function transcribeAudio(audioPath: string): Promise<string> {
  try {
    console.log(`[TRANSCRIBE] 🗣️ Starting transcription of: ${audioPath}`);
    
    const openai = getOpenAIClient();
    
    // Read audio file as Node stream
    const fileStream = createReadStream(audioPath);

    console.log(`[TRANSCRIBE] 📤 Sending to OpenAI Whisper API...`);

    // Call OpenAI Whisper API with file stream (no FormData needed)
    const response = await openai.audio.transcriptions.create({
      file: fileStream as any,
      model: 'whisper-1',
      response_format: 'text'
    });
    
    const transcript = response as unknown as string;
    
    console.log(`[TRANSCRIBE] ✅ Transcription complete: ${transcript.length} characters`);
    console.log(`[TRANSCRIBE] 📝 Preview: ${transcript.substring(0, 100)}...`);
    
    return transcript;
    
  } catch (error) {
    console.error(`[TRANSCRIBE] ❌ Transcription failed:`, error);
    throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
