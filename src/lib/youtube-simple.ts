// Simple YouTube API without binary dependencies for Vercel
import { VideoMetadata } from './platforms/base';

export interface SimpleVideoData {
  id: string;
  title: string;
  description: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  viewCount: string;
  likeCount: string;
  duration: string;
  tags?: string[];
}

export function extractVideoId(url: string): string | null {
  // YouTube URL patterns
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
    /youtube\.com\/.*[?&]v=([^&\n?#]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export async function getSimpleVideoData(videoId: string): Promise<SimpleVideoData> {
  // If we have YouTube API key, use it
  if (process.env.YOUTUBE_API_KEY) {
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${process.env.YOUTUBE_API_KEY}&part=snippet,statistics,contentDetails`
      );
      
      if (response.ok) {
        const data = await response.json();
        const video = data.items?.[0];
        
        if (video) {
          return {
            id: video.id,
            title: video.snippet.title,
            description: video.snippet.description,
            channelTitle: video.snippet.channelTitle,
            channelId: video.snippet.channelId,
            publishedAt: video.snippet.publishedAt,
            viewCount: video.statistics.viewCount || '0',
            likeCount: video.statistics.likeCount || '0',
            duration: video.contentDetails.duration,
            tags: video.snippet.tags || []
          };
        }
      }
    } catch (error) {
      console.warn('YouTube API failed, using fallback data:', error);
    }
  }

  // No fallback - if YouTube API fails, we fail
  throw new Error('YouTube API failed and no fallback data is available. Please check your YouTube API key.');
}

export async function getSimpleTranscript(videoId: string): Promise<string | null> {
  console.log(`[TRANSCRIPT] Attempting to fetch transcript for video: ${videoId}`);
  
  // Use YouTube Data API v3 captions endpoint - this actually works
  if (process.env.YOUTUBE_API_KEY) {
    try {
      console.log(`[TRANSCRIPT] Using YouTube Data API v3 for captions...`);
      
      // First, get available captions
      const captionsResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${process.env.YOUTUBE_API_KEY}`
      );
      
      if (captionsResponse.ok) {
        const captionsData = await captionsResponse.json();
        console.log(`[TRANSCRIPT] Captions available:`, captionsData.items?.length || 0);
        
        if (captionsData.items && captionsData.items.length > 0) {
          // Get the first available caption (usually English)
          const captionId = captionsData.items[0].id;
          console.log(`[TRANSCRIPT] Using caption ID: ${captionId}`);
          
          // Download the actual transcript
          const transcriptResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/captions/${captionId}?key=${process.env.YOUTUBE_API_KEY}`,
            {
              headers: {
                'Accept': 'text/plain'
              }
            }
          );
          
          if (transcriptResponse.ok) {
            const transcriptText = await transcriptResponse.text();
            console.log(`[TRANSCRIPT] Successfully downloaded transcript: ${transcriptText.length} characters`);
            return transcriptText;
          } else {
            console.warn(`[TRANSCRIPT] Failed to download transcript: ${transcriptResponse.status}`);
          }
        }
      }
    } catch (error) {
      console.warn(`[TRANSCRIPT] YouTube API captions failed:`, error);
    }
  }
  
  // Fallback: Try youtube-transcript package as last resort
  try {
    console.log(`[TRANSCRIPT] Trying youtube-transcript package as fallback...`);
    const { YoutubeTranscript } = await import('youtube-transcript');
    
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    console.log(`[TRANSCRIPT] Fallback transcript response:`, transcript?.length || 0, 'segments');
    
    if (transcript && transcript.length > 0) {
      const fullTranscript = transcript.map(item => item.text).join(' ');
      console.log(`[TRANSCRIPT] Fallback successful: ${fullTranscript.length} characters`);
      return fullTranscript;
    }
  } catch (error) {
    console.error(`[TRANSCRIPT] Fallback also failed:`, error);
  }
  
  console.warn(`[TRANSCRIPT] No transcript available for video ${videoId}`);
  return null;
}
