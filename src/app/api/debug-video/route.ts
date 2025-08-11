import { NextRequest, NextResponse } from 'next/server';
import { getSimpleVideoData, getSimpleTranscript, extractVideoId } from '@/lib/youtube-simple';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const videoUrl = url.searchParams.get('url');

    if (!videoUrl) {
      return NextResponse.json({ success: false, error: 'Video URL is required' }, { status: 400 });
    }

    console.log(`[DEBUG] Processing: ${videoUrl}`);

    // Step 1: Extract video ID
    const videoId = extractVideoId(videoUrl);
    console.log(`[DEBUG] Video ID: ${videoId}`);
    
    if (!videoId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid YouTube URL format',
        step: 'extract_video_id',
        videoUrl 
      }, { status: 400 });
    }

    // Step 2: Test YouTube API metadata
    let metadata = null;
    try {
      console.log(`[DEBUG] Fetching metadata...`);
      metadata = await getSimpleVideoData(videoId);
      console.log(`[DEBUG] Metadata success:`, JSON.stringify(metadata, null, 2));
    } catch (metaError) {
      console.error(`[DEBUG] Metadata failed:`, metaError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch video metadata',
        step: 'fetch_metadata',
        details: metaError instanceof Error ? metaError.message : 'Unknown error',
        videoId
      }, { status: 500 });
    }

    // Step 3: Test transcript extraction
    let transcript = null;
    try {
      console.log(`[DEBUG] Fetching transcript...`);
      transcript = await getSimpleTranscript(videoId);
      console.log(`[DEBUG] Transcript result: ${transcript ? `${transcript.length} chars` : 'null'}`);
    } catch (transcriptError) {
      console.error(`[DEBUG] Transcript failed:`, transcriptError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch transcript',
        step: 'fetch_transcript',
        details: transcriptError instanceof Error ? transcriptError.message : 'Unknown error',
        videoId,
        metadata
      }, { status: 500 });
    }

    // Step 4: Check environment variables
    const envCheck = {
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasYouTube: !!process.env.YOUTUBE_API_KEY,
      nodeEnv: process.env.NODE_ENV
    };

    return NextResponse.json({
      success: true,
      data: {
        videoId,
        metadata,
        transcript: transcript ? `${transcript.length} characters` : null,
        environment: envCheck,
        nextStep: transcript ? 'ready_for_analysis' : 'needs_audio_transcription'
      }
    });

  } catch (error) {
    console.error('[DEBUG] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected error in debug endpoint',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
