import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudioBlob } from '@/lib/vercel-audio';
import { logError, logPerformance } from '@/lib/monitoring';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const endpoint = '/api/transcribe-audio';
  const method = 'POST';

  try {
    console.log('[TRANSCRIBE-API] Processing audio transcription request...');

    // Get the audio blob from the request
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: 'No audio file provided' },
        { status: 400 }
      );
    }

    console.log(`[TRANSCRIBE-API] Received audio file: ${audioFile.size} bytes, type: ${audioFile.type}`);

    // Convert File to Blob
    const audioBlob = new Blob([await audioFile.arrayBuffer()], { type: audioFile.type });

    // Transcribe the audio
    const transcript = await transcribeAudioBlob(audioBlob);

    if (!transcript) {
      throw new Error('Failed to transcribe audio');
    }

    const duration = Date.now() - startTime;
    logPerformance({
      endpoint,
      method,
      duration,
      success: true,
      platform: 'openai-whisper'
    });

    return NextResponse.json({
      success: true,
      transcript,
      length: transcript.length
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    
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

    console.error('[TRANSCRIBE-API] Error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to transcribe audio',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
