/**
 * Plan B: Vercel-compatible audio transcription
 * Uses youtube-transcript npm package + YouTube Data API (no python dependencies)
 */

import { getOpenAI } from './openai';

/**
 * Get YouTube video info using ONLY YouTube Data API v3
 * No youtube-dl-exec needed!
 */
export async function getYouTubeAudioInfo(videoId: string) {
  const API_KEY = process.env.YOUTUBE_API_KEY;
  if (!API_KEY) {
    throw new Error('YouTube API key required');
  }

  try {
    // Get video details including content details
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${API_KEY}&part=snippet,contentDetails,status`
    );
    
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();
    const video = data.items?.[0];
    
    if (!video) {
      throw new Error('Video not found');
    }

    // Check if video is embeddable and not private
    const isEmbeddable = video.status?.embeddable !== false;
    const isPublic = video.status?.privacyStatus === 'public';
    
    return {
      videoId,
      title: video.snippet.title,
      duration: video.contentDetails.duration,
      isEmbeddable,
      isPublic,
      canTranscribe: isEmbeddable && isPublic
    };
  } catch (error) {
    console.error('[YOUTUBE-INFO] Error:', error);
    throw error;
  }
}

/**
 * Transcribe audio using Web Audio API approach
 * This works by having the client extract audio and send it to our API
 */
export async function createAudioTranscriptionEndpoint() {
  return {
    instructions: `
    To transcribe videos without captions:
    
    1. Client-side: Use Web Audio API to extract audio from YouTube embed
    2. Client-side: Send audio blob to our /api/transcribe-audio endpoint  
    3. Server-side: Use OpenAI Whisper to transcribe the audio blob
    
    This approach works on Vercel because:
    - No python dependencies (youtube-dl-exec)
    - No file system operations
    - Uses standard Web APIs
    `,
    
    // The actual transcription endpoint
    endpoint: '/api/transcribe-audio'
  };
}

/**
 * Alternative: Use YouTube's auto-generated transcript API
 * This is more reliable and works for most videos
 */
export async function getYouTubeTranscriptAPI(videoId: string): Promise<string | null> {
  try {
    console.log(`[YT-TRANSCRIPT] Trying YouTube transcript API for ${videoId}`);
    
    // Try multiple transcript APIs
    const transcriptMethods = [
      // Method 1: Official YouTube transcript
      async () => {
        const { YoutubeTranscript } = await import('youtube-transcript');
        const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
          lang: 'en'
        });
        return transcript?.map(item => item.text).join(' ') || null;
      },
      
      // Method 2: Try with auto-generated
      async () => {
        const { YoutubeTranscript } = await import('youtube-transcript');
        const transcript = await YoutubeTranscript.fetchTranscript(videoId);
        return transcript?.map(item => item.text).join(' ') || null;
      }
    ];

    for (const method of transcriptMethods) {
      try {
        const result = await method();
        if (result && result.length > 50) {
          console.log(`[YT-TRANSCRIPT] Success: ${result.length} characters`);
          return result;
        }
      } catch (error) {
        console.log(`[YT-TRANSCRIPT] Method failed:`, error);
        continue;
      }
    }

    return null;
  } catch (error) {
    console.error('[YT-TRANSCRIPT] All methods failed:', error);
    return null;
  }
}

/**
 * Server-side audio transcription from blob
 * This receives audio from client and transcribes it
 */
export async function transcribeAudioBlob(audioBlob: Blob): Promise<string | null> {
  try {
    console.log(`[BLOB-TRANSCRIBE] Processing audio blob: ${audioBlob.size} bytes`);
    
    const openai = getOpenAI();
    
    // Convert blob to file for OpenAI
    const audioFile = new File([audioBlob], 'audio.webm', { 
      type: audioBlob.type || 'audio/webm' 
    });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en'
    });

    console.log(`[BLOB-TRANSCRIBE] Success: ${transcription.text?.length || 0} characters`);
    return transcription.text || null;

  } catch (error) {
    console.error('[BLOB-TRANSCRIBE] Error:', error);
    throw error;
  }
}
