import { NextRequest, NextResponse } from 'next/server';
import { logError, logPerformance } from '@/lib/monitoring';
import { generateNicheSuggestions as generateGeminiNiches } from '@/lib/gemini';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const endpoint = '/api/niche-suggestions';
  const method = 'GET';
  
  try {
    const url = new URL(request.url);
    const interestsRaw = url.searchParams.get('interests') || '';
    const interests = interestsRaw ? interestsRaw.split(',') : [];
    const goals = url.searchParams.get('goals') || '';
    const audience = url.searchParams.get('audience') || '';

    if (!interests || !Array.isArray(interests) || interests.length === 0) {
      const duration = Date.now() - startTime;
      logPerformance({
        endpoint,
        method,
        duration,
        success: false
      });

      return NextResponse.json(
        { success: false, error: 'Interests array is required' },
        { status: 400 }
      );
    }

    console.log(`Niche suggestions request: ${interests.join(', ')}`);

    // Generate niche suggestions using Gemini 2.0 Flash
    const suggestions = await generateGeminiNiches(
      `${interests.join(', ')}${goals ? ` | goals: ${goals}` : ''}${audience ? ` | audience: ${audience}` : ''}`
    );

    const duration = Date.now() - startTime;
    logPerformance({
      endpoint,
      method,
      duration,
      success: true,
      platform: 'gemini'
    });

    return NextResponse.json({
      success: true,
      data: suggestions
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

    console.error('Niche suggestions error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate niche suggestions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
