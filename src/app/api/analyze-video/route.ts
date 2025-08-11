import { NextRequest, NextResponse } from 'next/server';
import { logError, logPerformance } from '@/lib/monitoring';
import { analyzeTranscript, generateIdeas } from '@/lib/analysis';
import { getSimpleVideoData, getSimpleTranscript, extractVideoId } from '@/lib/youtube-simple';
import { startAssemblyAITranscription } from '@/lib/assemblyai';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const endpoint = '/api/analyze-video';
  const method = 'GET';
  
  console.log(`[DEBUG-API] 🚀 ${endpoint} called with method: ${method}`);
  
  try {
    const url = new URL(request.url);
    const videoUrl = url.searchParams.get('url');
    const providedTranscript = url.searchParams.get('transcript');

    console.log(`[DEBUG-API] 📹 Video URL: ${videoUrl}`);
    console.log(`[DEBUG-API] 📝 Provided transcript: ${providedTranscript ? 'YES' : 'NO'}`);

    if (!videoUrl) {
      console.log('[DEBUG-API] ❌ No video URL provided');
      return NextResponse.json({
        success: false,
        error: 'Video URL is required'
      }, { status: 400 });
    }

    console.log(`[DEBUG-API] 🔍 Extracting video ID from: ${videoUrl}`);
    const videoId = extractVideoId(videoUrl);
    if (!videoId) { 
      console.log('[DEBUG-API] ❌ Invalid YouTube URL format');
      throw new Error('Invalid YouTube URL format'); 
    }
    console.log(`[DEBUG-API] ✅ Video ID extracted: ${videoId}`);

    console.log(`[DEBUG-API] 📊 Getting video metadata for: ${videoId}`);
    const videoData = await getSimpleVideoData(videoId);
    const metadata = {
      id: videoData.id,
      title: videoData.title,
      channel: videoData.channelTitle,
      uploader: videoData.channelTitle,
      views: parseInt(videoData.viewCount) || 0,
      published: videoData.publishedAt,
      duration: videoData.duration
    };
    console.log(`[DEBUG-API] ✅ Metadata obtained: ${metadata.title} by ${metadata.channel} (${metadata.views} views)`);

    // If transcript is provided directly (from AssemblyAI completion), use it
    let transcript: string | null = null;
    if (providedTranscript) {
      console.log(`[DEBUG-API] 📝 Using provided transcript (${providedTranscript.length} characters)`);
      transcript = providedTranscript;
    } else {
      console.log('[DEBUG-API] 🔍 Fetching transcript from YouTube...');
      transcript = await getSimpleTranscript(videoId);
      console.log(`[DEBUG-API] 📝 Transcript result: ${transcript ? `${transcript.length} characters` : 'NOT FOUND'}`);
    }
    
    if (!transcript) {
      console.log('[DEBUG-API] 🎯 No transcript found, trying AssemblyAI transcription...');
      
      try {
        // Start AssemblyAI transcription but don't wait for completion
        const assemblyJob = await startAssemblyAITranscription(videoUrl);
        
        if (assemblyJob) {
          console.log(`[DEBUG-API] ✅ AssemblyAI job started: ${assemblyJob.id} (status: ${assemblyJob.status})`);
          // Return early with job info - user can poll for results
          return NextResponse.json({
            success: true,
            status: 'transcribing',
            message: 'Video is being transcribed. This may take a few minutes.',
            assemblyJobId: assemblyJob.id,
            metadata,
            estimatedTime: '2-5 minutes'
          });
        } else {
          console.log('[DEBUG-API] ❌ Failed to start AssemblyAI transcription');
          throw new Error('Failed to start AssemblyAI transcription');
        }
      } catch (assemblyError) {
        console.error('[DEBUG-API] ❌ AssemblyAI error:', assemblyError);
        
        // Provide a helpful error message with alternatives
        const errorMessage = `This video "${metadata.title}" doesn't have captions/subtitles available, and audio transcription is currently not supported for YouTube videos. 

Please try:
1. A different YouTube video that has captions enabled
2. Most popular YouTube videos have auto-generated captions
3. Look for videos with the "CC" (closed captions) button enabled

Error details: ${assemblyError instanceof Error ? assemblyError.message : 'Audio transcription failed'}`;
        
        throw new Error(errorMessage);
      }
    }

    console.log(`[DEBUG-API] ✅ Transcript ready (${transcript.length} characters)`);

    // Check environment variables
    console.log('[DEBUG-API] 🔑 Checking environment variables...');
    console.log('[DEBUG-API] 🔑 OPENAI_API_KEY present:', !!process.env.OPENAI_API_KEY);
    console.log('[DEBUG-API] 🔑 NODE_ENV:', process.env.NODE_ENV);
    
    if (!process.env.OPENAI_API_KEY) {
      console.log('[DEBUG-API] ❌ Missing OPENAI_API_KEY');
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
    }

    // Analyze the transcript
    console.log('[DEBUG-API] 🧠 Starting transcript analysis with OpenAI...');
    const analysis = await analyzeTranscript(transcript, {
      title: metadata.title,
      channel: metadata.channel,
      views: metadata.views
    });
    console.log(`[DEBUG-API] ✅ Analysis complete:`, Object.keys(analysis));

    // Generate content ideas
    console.log('[DEBUG-API] 💡 Generating content ideas...');
    const ideas = await generateIdeas(analysis);
    console.log(`[DEBUG-API] ✅ Generated ${ideas.length} ideas`);

    const result = {
      metadata,
      transcript,
      analysis,
      ideas
    };

    const duration = Date.now() - startTime;
    console.log(`[DEBUG-API] ⏱️ Total processing time: ${duration}ms`);
    
    logPerformance({
      endpoint,
      method,
      duration,
      success: true,
      platform: 'youtube'
    });

    console.log('[DEBUG-API] 🎉 SUCCESS! Returning complete analysis');
    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[DEBUG-API] ❌ Error after ${duration}ms:`, error);
    
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

    console.error('[DEBUG-API] ❌ Final error response:', error);
    
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
