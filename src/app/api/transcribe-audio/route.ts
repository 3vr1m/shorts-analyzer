import { NextRequest, NextResponse } from 'next/server';
import { getOpenAI } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json({
        success: false,
        error: 'No audio file provided'
      }, { status: 400 });
    }

    console.log(`[TRANSCRIBE] Processing audio file: ${audioFile.name} (${audioFile.size} bytes)`);

    // Convert File to Buffer for OpenAI
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a Blob-like object that OpenAI can process
    const audioBlob = new Blob([buffer], { type: audioFile.type });
    
    // Use OpenAI Whisper for transcription
    const openai = getOpenAI();
    const transcription = await openai.audio.transcriptions.create({
      file: audioBlob as any,
      model: 'whisper-1',
      language: 'en',
    });

    console.log(`[TRANSCRIBE] Transcription completed: ${transcription.text?.length || 0} characters`);

    return NextResponse.json({
      success: true,
      transcript: transcription.text,
      message: 'Audio transcribed successfully'
    });

  } catch (error) {
    console.error('[TRANSCRIBE] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to transcribe audio',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
