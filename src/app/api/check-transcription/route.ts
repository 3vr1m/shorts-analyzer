import { NextRequest, NextResponse } from 'next/server';
import { checkAssemblyAIStatus } from '@/lib/assemblyai';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const transcriptId = url.searchParams.get('id');

    if (!transcriptId) {
      return NextResponse.json({
        success: false,
        error: 'Missing transcript ID'
      }, { status: 400 });
    }

    console.log(`[CHECK-TRANSCRIPTION] Checking status for: ${transcriptId}`);

    const status = await checkAssemblyAIStatus(transcriptId);
    
    if (!status) {
      return NextResponse.json({
        success: false,
        error: 'Failed to check status'
      }, { status: 500 });
    }

    if (status.status === 'completed' && status.text) {
      return NextResponse.json({
        success: true,
        status: 'completed',
        transcript: status.text,
        message: 'Transcription completed successfully!'
      });
    } else if (status.status === 'error') {
      return NextResponse.json({
        success: false,
        status: 'error',
        error: status.error || 'Transcription failed'
      }, { status: 500 });
    } else {
      return NextResponse.json({
        success: true,
        status: status.status,
        message: `Transcription is ${status.status}. Please wait...`
      });
    }

  } catch (error) {
    console.error('[CHECK-TRANSCRIPTION] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check transcription status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
