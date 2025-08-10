import { NextRequest, NextResponse } from 'next/server';
import { logError, logPerformance } from '@/lib/monitoring';
import { generateNicheSuggestions } from '@/lib/openai';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const endpoint = '/api/niche-suggestions';
  const method = 'POST';
  
  try {
    const body = await request.json();
    const { interests, goals, audience } = body;

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

    // Generate niche suggestions using OpenAI
    const suggestions = await generateNicheSuggestions(interests, goals, audience);

    const duration = Date.now() - startTime;
    logPerformance({
      endpoint,
      method,
      duration,
      success: true,
      platform: 'openai'
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
