import { NextRequest, NextResponse } from 'next/server';
import { getSimpleVideoData, getSimpleTranscript, extractVideoId } from '@/lib/youtube-simple';

export async function GET(request: NextRequest) {
  const steps: any[] = [];
  
  try {
    const url = new URL(request.url);
    const videoUrl = url.searchParams.get('url');

    if (!videoUrl) {
      return NextResponse.json({ success: false, error: 'Video URL is required' }, { status: 400 });
    }

    steps.push({ step: 1, action: 'Extract video ID', status: 'starting' });

    // Step 1: Extract video ID
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      steps.push({ step: 1, action: 'Extract video ID', status: 'failed', error: 'Invalid URL' });
      return NextResponse.json({ success: false, error: 'Invalid YouTube URL', steps }, { status: 400 });
    }
    steps.push({ step: 1, action: 'Extract video ID', status: 'success', result: videoId });

    steps.push({ step: 2, action: 'Get metadata', status: 'starting' });

    // Step 2: Get metadata
    const videoData = await getSimpleVideoData(videoId);
    const metadata = {
      id: videoData.id,
      title: videoData.title,
      channel: videoData.channelTitle,
      views: parseInt(videoData.viewCount) || 0,
    };
    steps.push({ step: 2, action: 'Get metadata', status: 'success', result: metadata });

    steps.push({ step: 3, action: 'Get transcript', status: 'starting' });

    // Step 3: Get transcript
    const transcript = await getSimpleTranscript(videoId);
    if (!transcript) {
      steps.push({ step: 3, action: 'Get transcript', status: 'failed', error: 'No captions' });
      return NextResponse.json({ 
        success: false, 
        error: `No captions for "${metadata.title}"`, 
        steps,
        metadata 
      }, { status: 400 });
    }
    steps.push({ step: 3, action: 'Get transcript', status: 'success', result: `${transcript.length} chars` });

    steps.push({ step: 4, action: 'Test OpenAI import', status: 'starting' });

    // Step 4: Test OpenAI import (this might be where it crashes)
    try {
      const { analyzeTranscript } = await import('@/lib/analysis');
      steps.push({ step: 4, action: 'Test OpenAI import', status: 'success' });

      steps.push({ step: 5, action: 'Test analysis call', status: 'starting' });

      // Step 5: Try actual analysis (this is likely where it crashes)
      const analysis = await analyzeTranscript(transcript.substring(0, 500), {
        title: metadata.title,
        channel: metadata.channel,
        views: metadata.views
      });
      
      steps.push({ step: 5, action: 'Test analysis call', status: 'success', result: Object.keys(analysis) });

      return NextResponse.json({
        success: true,
        message: 'All steps completed successfully!',
        steps,
        analysisKeys: Object.keys(analysis)
      });

    } catch (analysisError) {
      steps.push({ 
        step: 4, 
        action: 'OpenAI analysis', 
        status: 'failed', 
        error: analysisError instanceof Error ? analysisError.message : 'Unknown error',
        stack: analysisError instanceof Error ? analysisError.stack : undefined
      });
      
      return NextResponse.json({
        success: false,
        error: 'OpenAI analysis failed',
        steps,
        details: analysisError instanceof Error ? analysisError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    steps.push({ 
      step: 'unknown', 
      action: 'General error', 
      status: 'failed', 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json({
      success: false,
      error: 'Step test failed',
      steps,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
