import { NextRequest, NextResponse } from 'next/server';
import { logError, logPerformance } from '@/lib/monitoring';
import { analyzeTranscript, generateIdeas } from '@/lib/analysis';
import { getVideoInfo, extractSubtitles } from '@/lib/ytdlp';

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

    // Get video metadata
    const metadata = await getVideoInfo(url);
    
    // Extract subtitles/transcript
    const transcript = await extractSubtitles(url);
    
    if (!transcript) {
      throw new Error('Could not extract transcript from video');
    }

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
