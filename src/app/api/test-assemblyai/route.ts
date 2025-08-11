import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const videoUrl = url.searchParams.get('url') || 'https://www.youtube.com/watch?v=E0hrcDO3Noc';

    console.log(`[TEST-ASSEMBLYAI] Testing AssemblyAI for: ${videoUrl}`);

    // Check if API key is present
    const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;
    if (!ASSEMBLYAI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'AssemblyAI API key not configured',
        step: 'check_api_key'
      }, { status: 500 });
    }

    console.log('[TEST-ASSEMBLYAI] API key found, testing request...');

    // Test AssemblyAI request
    const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'Authorization': ASSEMBLYAI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: videoUrl,
        language_code: 'en_us',
        speech_model: 'nano'
      }),
    });

    console.log(`[TEST-ASSEMBLYAI] Response status: ${transcriptResponse.status}`);

    if (!transcriptResponse.ok) {
      const errorData = await transcriptResponse.json().catch(() => null);
      console.error('[TEST-ASSEMBLYAI] Request failed:', errorData);
      return NextResponse.json({
        success: false,
        error: `AssemblyAI request failed: ${transcriptResponse.status}`,
        details: errorData,
        step: 'submit_request'
      }, { status: 500 });
    }

    const transcript = await transcriptResponse.json();
    console.log('[TEST-ASSEMBLYAI] Job submitted:', transcript.id);

    return NextResponse.json({
      success: true,
      message: 'AssemblyAI request successful',
      transcriptId: transcript.id,
      status: transcript.status,
      step: 'job_submitted'
    });

  } catch (error) {
    console.error('[TEST-ASSEMBLYAI] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      step: 'general_error'
    }, { status: 500 });
  }
}
