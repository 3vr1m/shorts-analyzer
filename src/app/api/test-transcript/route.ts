import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const videoId = url.searchParams.get('videoId') || 'E0hrcDO3Noc';

    console.log(`[TEST-TRANSCRIPT] Testing youtube-transcript package for: ${videoId}`);

    // Test 1: Can we import the package?
    try {
      const { YoutubeTranscript } = await import('youtube-transcript');
      console.log('[TEST-TRANSCRIPT] Package imported successfully');

      // Test 2: Can we call the function?
      console.log('[TEST-TRANSCRIPT] Attempting to fetch transcript...');
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      
      console.log(`[TEST-TRANSCRIPT] Raw response:`, typeof transcript, transcript?.length);
      
      if (transcript && transcript.length > 0) {
        const fullText = transcript.map(item => item.text).join(' ');
        return NextResponse.json({
          success: true,
          message: 'youtube-transcript works!',
          videoId,
          transcriptLength: fullText.length,
          segmentCount: transcript.length,
          preview: fullText.substring(0, 200)
        });
      } else {
        return NextResponse.json({
          success: false,
          message: 'youtube-transcript returned empty result',
          videoId,
          rawResponse: transcript
        });
      }
    } catch (transcriptError) {
      console.error('[TEST-TRANSCRIPT] Transcript fetch failed:', transcriptError);
      return NextResponse.json({
        success: false,
        error: 'Transcript fetch failed',
        details: transcriptError instanceof Error ? transcriptError.message : 'Unknown error',
        stack: transcriptError instanceof Error ? transcriptError.stack : undefined
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[TEST-TRANSCRIPT] General error:', error);
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
