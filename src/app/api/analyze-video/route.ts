import { NextRequest, NextResponse } from 'next/server';
import { logError, logPerformance } from '@/lib/monitoring';
import { analyzeTranscript, generateIdeas } from '@/lib/analysis';
import { extractVideoId, getSimpleVideoData, getSimpleTranscript } from '@/lib/youtube-simple';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const endpoint = '/api/analyze-video';
  const method = 'POST';
  
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      const duration = Date.now() - startTime;
      logPerformance({
        endpoint,
        method,
        duration,
        success: false
      });

      return NextResponse.json(
        { success: false, error: 'Video URL is required' },
        { status: 400 }
      );
    }

    console.log(`Video analysis request for: ${url}`);

    // Extract video ID from URL
    const videoId = extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL format');
    }

    // Get video metadata using simple approach (works on Vercel)
    console.log(`[METADATA] Fetching video data for: ${videoId}`);
    const youtubeData = await getSimpleVideoData(videoId);
    
    // Get transcript using simple approach (works on Vercel)
    console.log(`[TRANSCRIPT] Attempting transcript extraction for: ${videoId}`);
    const transcript = await getSimpleTranscript(videoId);
    
    if (!transcript) {
      throw new Error('Could not extract transcript from video. Please try another video with captions available.');
    }

    console.log(`[TRANSCRIPT] Successfully extracted transcript (${transcript.length} characters)`);

    // Convert to our metadata format
    const metadata = {
      id: youtubeData.id,
      title: youtubeData.title,
      channel: youtubeData.channelTitle,
      uploader: youtubeData.channelTitle,
      view_count: parseInt(youtubeData.viewCount) || 0,
      upload_date: youtubeData.publishedAt,
      duration: 45 // Default duration
    };

    // Analyze the transcript
    const analysis = await analyzeTranscript(transcript, {
      title: metadata.title,
      channel: metadata.channel,
      views: metadata.view_count
    });

    // Generate content ideas
    const ideas = await generateIdeas(analysis);

    const result = {
      metadata,
      transcript,
      analysis,
      ideas
    };

    const duration = Date.now() - startTime;
    logPerformance({
      endpoint,
      method,
      duration,
      success: true,
      platform: 'youtube'
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Log the error
    logError({
      endpoint,
      method,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    logPerformance({
      endpoint,
      method,
      duration,
      success: false
    });

    console.error('Video analysis error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to analyze video',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
