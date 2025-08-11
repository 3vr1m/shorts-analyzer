import { NextRequest, NextResponse } from 'next/server';
import { logError, logPerformance } from '@/lib/monitoring';
import { analyzeTranscript, generateIdeas, transcribeAudio } from '@/lib/analysis';
import { getVideoInfo, extractSubtitles, downloadAudioAsWav } from '@/lib/ytdlp';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const endpoint = '/api/analyze-video';
  const method = 'POST';
  
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      const duration = Date.now() - startTime;
      logPerformance({
        endpoint,
        method,
        duration,
        success: false
      });

      return NextResponse.json(
        { success: false, error: 'Video URL is required' },
        { status: 400 }
      );
    }

    console.log(`Video analysis request for: ${url}`);

    // Get video metadata using the same yt-dlp approach that works for trends
    const metadata = await getVideoInfo(url);
    
    let transcript: string;
    
    // Step 1: Try to extract subtitles/captions (free and fast)
    console.log(`[TRANSCRIPT] Attempting subtitle extraction for: ${url}`);
    const subtitleTranscript = await extractSubtitles(url);
    
    if (subtitleTranscript) {
      console.log(`[TRANSCRIPT] Successfully extracted subtitles`);
      transcript = subtitleTranscript;
    } else {
      // Step 2: Fallback to audio transcription via OpenAI Whisper (costs money but works for any video)
      console.log(`[TRANSCRIPT] No subtitles found, falling back to audio transcription`);
      
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('No subtitles available and OpenAI API key not configured for audio transcription');
      }
      
      let audioCleanup: (() => Promise<void>) | null = null;
      try {
        // Download audio
        const { wavPath, cleanup } = await downloadAudioAsWav(url);
        audioCleanup = cleanup;
        
        // Transcribe using OpenAI Whisper
        console.log(`[TRANSCRIPT] Transcribing audio with OpenAI Whisper`);
        transcript = await transcribeAudio(wavPath);
        
        // Clean up audio file
        await cleanup();
        console.log(`[TRANSCRIPT] Successfully transcribed audio`);
      } catch (error) {
        if (audioCleanup) {
          await audioCleanup();
        }
        throw new Error(`Could not extract transcript from video: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Analyze the transcript
    const analysis = await analyzeTranscript(transcript, {
      title: metadata.title,
      channel: metadata.channel,
      views: metadata.view_count
    });

    // Generate content ideas
    const ideas = await generateIdeas(analysis);

    const result = {
      metadata,
      transcript,
      analysis,
      ideas
    };

    const duration = Date.now() - startTime;
    logPerformance({
      endpoint,
      method,
      duration,
      success: true,
      platform: 'youtube'
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

    console.error('Video analysis error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to analyze video',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
