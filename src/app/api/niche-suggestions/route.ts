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

    // Build NicheResult object expected by frontend
    const primary = suggestions[0] || interests[0] || 'Your Niche';
    const contentPillars = (suggestions.slice(0, 3).length === 3
      ? suggestions.slice(0, 3)
      : [
          `${primary} basics`,
          `${primary} tips`,
          `${primary} mistakes`
        ]).map((s) => s.trim());

    const contentIdeas = (suggestions.slice(0, 3).length
      ? suggestions.slice(0, 3)
      : contentPillars).map((s) => ({
        title: s,
        hook: `Why ${s} matters right now`,
        format: 'Short-form'
      }));

    const nicheResult = {
      niche: primary,
      description:
        goals || audience
          ? `A niche around ${primary} aimed at ${audience || 'your target audience'} with the goal to ${goals || 'grow engagement'}.`
          : `A focused niche around ${primary} with high short-form potential.`,
      targetAudience: audience || `People interested in ${primary.toLowerCase()}`,
      contentPillars,
      contentIdeas,
      trendingTopics: suggestions.slice(0, 5)
    };

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
      data: nicheResult
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
