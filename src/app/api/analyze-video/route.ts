import { NextRequest, NextResponse } from 'next/server';
import { logError, logPerformance } from '@/lib/monitoring';
import { analyzeTranscript, generateIdeas } from '@/lib/analysis';
import { getSimpleVideoData, getSimpleTranscript, extractVideoId } from '@/lib/youtube-simple';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const endpoint = '/api/analyze-video';
  const method = 'GET';
  
  try {
    const url = new URL(request.url);
    const videoUrl = url.searchParams.get('url');

    if (!videoUrl) {
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

    console.log(`Video analysis request for: ${videoUrl}`);

    // Extract video ID using our real function
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL format');
    }

    console.log(`[ANALYSIS] Processing video: ${videoId}`);

    // Get REAL video metadata using YouTube Data API v3
    console.log('[METADATA] Fetching real video data from YouTube API v3...');
    const videoData = await getSimpleVideoData(videoId);
    
    const metadata = {
      id: videoData.id,
      title: videoData.title,
      channel: videoData.channelTitle,
      uploader: videoData.channelTitle,
      views: parseInt(videoData.viewCount) || 0,
      published: videoData.publishedAt,
      duration: videoData.duration
    };

    console.log(`[METADATA] Got real data: ${metadata.title} by ${metadata.channel}`);

    // Get REAL transcript
    console.log('[TRANSCRIPT] Fetching real transcript...');
    const transcript = await getSimpleTranscript(videoId);
    
    if (!transcript) {
      // Give helpful error message
      throw new Error(`This video "${metadata.title}" does not have accessible captions. Please try a different YouTube video that has captions/subtitles enabled. Most popular YouTube videos have auto-generated captions.`);
    }

    console.log(`[TRANSCRIPT] Got real transcript (${transcript.length} characters)`);

    // Check environment variables
    console.log('[ENV] Checking environment variables...');
    console.log('[ENV] OPENAI_API_KEY present:', !!process.env.OPENAI_API_KEY);
    console.log('[ENV] NODE_ENV:', process.env.NODE_ENV);
    
    if (!process.env.OPENAI_API_KEY) {
      console.error('[ENV] Missing OPENAI_API_KEY');
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
    }

    // Analyze the transcript
    console.log('[ANALYSIS] Starting transcript analysis...');
    const analysis = await analyzeTranscript(transcript, {
      title: metadata.title,
      channel: metadata.channel,
      views: metadata.views
    });
    console.log('[ANALYSIS] Analysis complete:', Object.keys(analysis));

    // Generate content ideas
    console.log('[IDEAS] Generating content ideas...');
    const ideas = await generateIdeas(analysis);
    console.log('[IDEAS] Generated', ideas.length, 'ideas');

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
