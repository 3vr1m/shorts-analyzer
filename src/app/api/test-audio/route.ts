import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const videoUrl = url.searchParams.get('url') || 'https://www.youtube.com/watch?v=E0hrcDO3Noc';

  try {
    console.log('[TEST-AUDIO] Testing youtube-dl-exec...');
    
    // Test if youtube-dl-exec can import
    const youtubeDl = (await import('youtube-dl-exec')).default;
    console.log('[TEST-AUDIO] youtube-dl-exec imported successfully');

    // Test if it can get info (this is where it probably fails)
    console.log('[TEST-AUDIO] Attempting to get video info...');
    const info = await youtubeDl(videoUrl, {
      dumpSingleJson: true,
      format: 'bestaudio',
      quiet: true,
      noWarnings: true,
    });

    console.log('[TEST-AUDIO] Got info:', typeof info);
    
    const audioUrl = (info as any)?.url;
    console.log('[TEST-AUDIO] Audio URL:', audioUrl ? 'Found' : 'Not found');

    return NextResponse.json({
      success: true,
      message: 'youtube-dl-exec works on Vercel!',
      hasAudioUrl: !!audioUrl,
      infoType: typeof info
    });

  } catch (error) {
    console.error('[TEST-AUDIO] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'youtube-dl-exec failed on Vercel',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
