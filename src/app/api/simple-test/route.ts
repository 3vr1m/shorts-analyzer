import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('[SIMPLE-TEST] Starting...');
    
    const body = await request.json();
    console.log('[SIMPLE-TEST] Body received:', body);
    
    // Test if OpenAI import works
    console.log('[SIMPLE-TEST] Testing OpenAI import...');
    const { getOpenAI } = await import('@/lib/openai');
    console.log('[SIMPLE-TEST] OpenAI imported successfully');
    
    // Test if we can create a simple completion
    console.log('[SIMPLE-TEST] Testing OpenAI API call...');
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('No OpenAI API key');
    }
    
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "user", content: "Say 'Hello from Vercel!'" }
      ],
      max_tokens: 10
    });
    
    console.log('[SIMPLE-TEST] OpenAI response received');
    
    return NextResponse.json({
      success: true,
      message: 'All systems working',
      openaiResponse: completion.choices[0]?.message?.content,
      env: {
        hasOpenAI: !!process.env.OPENAI_API_KEY,
        nodeEnv: process.env.NODE_ENV
      }
    });
    
  } catch (error) {
    console.error('[SIMPLE-TEST] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
