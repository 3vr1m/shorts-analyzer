import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('[TEST] API test endpoint called');
    
    return NextResponse.json({
      success: true,
      message: 'API is working',
      env: {
        NODE_ENV: process.env.NODE_ENV,
        hasOpenAI: !!process.env.OPENAI_API_KEY,
        hasGemini: !!process.env.GEMINI_API_KEY,
        hasYouTube: !!process.env.YOUTUBE_API_KEY,
        hasRapidAPI: !!process.env.RAPIDAPI_KEY,
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[TEST] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
