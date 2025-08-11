import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('[MINIMAL-GET] Starting GET test...');
    
    const url = new URL(request.url);
    const videoUrl = url.searchParams.get('url') || 'https://youtu.be/E0hrcDO3Noc';
    
    console.log('[MINIMAL-GET] Processing URL:', videoUrl);
    
    // Extract video ID
    const videoIdMatch = videoUrl?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    const videoId = videoIdMatch ? videoIdMatch[1] : 'demo';
    
    console.log('[MINIMAL-GET] Video ID:', videoId);
    
    // Create response matching Analysis interface
    const result = {
      metadata: {
        title: "Sample Video Analysis (GET Method Works!)",
        channel: "Test Creator",
        views: 50000,
        published: new Date().toISOString()
      },
      transcript: "This is a test transcript to verify that GET method works perfectly on Vercel. The issue was that POST requests were failing, but GET requests work fine. Now we can proceed to fix all our APIs.",
      analysis: {
        hook: "🎉 GET Method Success!",
        entryStyle: "Direct and informative",
        niche: "Technical Debugging",
        structure: "Problem → Solution → Success",
        lengthSeconds: 30,
        pace: "Fast",
        emotion: "Excited and relieved"
      },
      ideas: [
        {
          title: "How to Debug API Issues on Vercel",
          hook: "Ever wondered why your APIs work locally but fail on Vercel?",
          outline: "1. Test GET vs POST methods\n2. Check environment variables\n3. Verify function configurations\n4. Test with minimal endpoints",
          suggestedLength: 45,
          tone: "Educational",
          exampleTranscript: "Today I'll show you exactly how to debug API issues on Vercel. First, always test with a simple GET request..."
        },
        {
          title: "The GET vs POST Mystery Solved",
          hook: "This one configuration issue cost me hours of debugging...",
          outline: "1. POST requests failing\n2. GET requests working\n3. The solution that saved the day",
          suggestedLength: 30,
          tone: "Story-driven"
        }
      ]
    };
    
    return NextResponse.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('[MINIMAL-GET] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[MINIMAL] Starting minimal test...');
    
    const body = await request.json();
    const { url } = body;
    
    console.log('[MINIMAL] Processing URL:', url);
    
    // Extract video ID
    const videoIdMatch = url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    const videoId = videoIdMatch ? videoIdMatch[1] : 'demo';
    
    console.log('[MINIMAL] Video ID:', videoId);
    
    // Create simple response without any external dependencies
    const result = {
      metadata: {
        id: videoId,
        title: "Sample Video Analysis",
        channel: "Test Creator",
        uploader: "Test Creator",
        view_count: 50000,
        upload_date: new Date().toISOString(),
        duration: 45
      },
      transcript: "This is a sample transcript for testing purposes. The video discusses content creation strategies and audience engagement techniques.",
      analysis: {
        hook: "Strong opening with a compelling question",
        entryStyle: "Educational and engaging",
        niche: "Content Creation",
        structure: "Problem-solution format",
        lengthSeconds: 45,
        pace: "moderate",
        emotion: "informative"
      },
      ideas: [
        {
          title: "5 Content Creation Mistakes to Avoid",
          hook: "Are you making these critical content mistakes?",
          outline: "Introduction to common mistakes, detailed breakdown of each mistake, solutions and best practices, conclusion with action steps"
        },
        {
          title: "The Secret to Viral Content",
          hook: "This one strategy changed everything for me",
          outline: "Personal story, the strategy revealed, how to implement it, examples of success, call to action"
        },
        {
          title: "From 0 to 100K Followers",
          hook: "Here's exactly how I grew my audience",
          outline: "Starting point, growth strategy, key milestones, lessons learned, advice for beginners"
        }
      ]
    };
    
    console.log('[MINIMAL] Returning success response');
    
    return NextResponse.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('[MINIMAL] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
