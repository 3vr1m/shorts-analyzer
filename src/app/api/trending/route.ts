import { NextRequest, NextResponse } from 'next/server';
import { logError, logPerformance } from '@/lib/monitoring';
import { ytSearchAndHydrate } from '@/lib/ytsearch';



export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const endpoint = '/api/trending';
  const method = 'GET';
  
  try {
    const url = new URL(request.url);
    const country = url.searchParams.get('country') || 'US';
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const platform = url.searchParams.get('platform') || 'youtube';
    const category = url.searchParams.get('category');
    const videoDuration = url.searchParams.get('duration') || 'short';

    // Log the request
    console.log(`Trending request: ${platform} - ${country} (${limit} items)${category ? ` - niche: ${category}` : ''} - duration: ${videoDuration}`);

    if (platform !== 'youtube') {
      // For now, only YouTube is supported
      const duration = Date.now() - startTime;
      logPerformance({
        endpoint,
        method,
        duration,
        success: false,
        platform
      });

      return NextResponse.json({
        success: false,
        error: `Platform ${platform} not yet supported`,
        data: { trendingVideos: [], meta: { total: 0, country, platform } }
      });
    }

    // Get REAL trending videos using YouTube search
    console.log(`Fetching REAL trending content for ${category || 'trending'} in ${country}`);
    
    const searchResults = await ytSearchAndHydrate({
      niche: category || 'trending',
      duration: videoDuration as "short" | "medium" | "long",
      max: limit,
      country: country
    });

    // Convert to our expected format
    const trendingVideos = searchResults.map((video: any) => ({
      id: video.id,
      title: video.title,
      creator: video.channel,
      channel: video.channel,
      viewCount: video.views || 0,
      duration: video.durationSeconds || 0,
      likeCount: video.likeCount || 0,
      commentCount: video.commentCount || 0,
      publishedAt: video.publishedAt || new Date().toISOString(),
      url: video.url,
      platform: 'youtube',
      hashtags: category ? [`#${category}`, '#trending'] : ['#trending', '#viral'],
      region: country
    }));

    const result = {
      trendingVideos: trendingVideos.sort((a, b) => b.viewCount - a.viewCount),
      meta: {
        total: limit,
        country,
        platform: 'youtube',
        category: category || 'general'
      }
    };

    const duration = Date.now() - startTime;
    logPerformance({
      endpoint,
      method,
      duration,
      success: true,
      platform,
      cacheHit: false
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

    console.error('Trending API error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch trending content',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
