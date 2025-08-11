import { NextRequest, NextResponse } from 'next/server';
import { getSimpleVideoData, getSimpleTranscript, extractVideoId } from '@/lib/youtube-simple';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const videoUrl = url.searchParams.get('url');

    if (!videoUrl) {
      return NextResponse.json({ success: false, error: 'Video URL is required' }, { status: 400 });
    }

    console.log(`[MINIMAL-ANALYZE] Processing: ${videoUrl}`);

    // Step 1: Extract video ID
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      return NextResponse.json({ success: false, error: 'Invalid YouTube URL' }, { status: 400 });
    }

    // Step 2: Get metadata
    console.log(`[MINIMAL-ANALYZE] Getting metadata for: ${videoId}`);
    const videoData = await getSimpleVideoData(videoId);
    
    const metadata = {
      id: videoData.id,
      title: videoData.title,
      channel: videoData.channelTitle,
      views: parseInt(videoData.viewCount) || 0,
      published: videoData.publishedAt
    };

    // Step 3: Try transcript
    console.log(`[MINIMAL-ANALYZE] Getting transcript...`);
    const transcript = await getSimpleTranscript(videoId);

    if (!transcript) {
      return NextResponse.json({
        success: false,
        error: `Video "${metadata.title}" has no accessible captions. This is a limitation we're working to resolve.`,
        metadata,
        needsAudioTranscription: true
      }, { status: 400 });
    }

    // Step 4: Simple response (no OpenAI analysis yet)
    return NextResponse.json({
      success: true,
      message: 'Video analysis ready',
      data: {
        metadata,
        transcript: `${transcript.length} characters extracted`,
        readyForAnalysis: true
      }
    });

  } catch (error) {
    console.error('[MINIMAL-ANALYZE] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
