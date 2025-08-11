/**
 * AssemblyAI transcription service - works perfectly on Vercel
 * More reliable than OpenAI Whisper for audio URLs
 */

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;
const ASSEMBLYAI_BASE_URL = 'https://api.assemblyai.com/v2';

export async function transcribeWithAssemblyAI(youtubeUrl: string): Promise<string | null> {
  if (!ASSEMBLYAI_API_KEY) {
    console.warn('[ASSEMBLYAI] API key not configured, skipping...');
    return null;
  }

  try {
    console.log(`[ASSEMBLYAI] Starting transcription for: ${youtubeUrl}`);

    // Get direct audio stream URL
    const youtubeDl = (await import('youtube-dl-exec')).default;
    const info = await youtubeDl(youtubeUrl, {
      dumpSingleJson: true,
      format: 'bestaudio',
      quiet: true,
      noWarnings: true,
    });

    const audioUrl = (info as any).url;
    if (!audioUrl) {
      throw new Error('Could not get audio stream URL');
    }

    console.log(`[ASSEMBLYAI] Got audio URL, submitting for transcription...`);

    // Submit transcription job
    const transcriptResponse = await fetch(`${ASSEMBLYAI_BASE_URL}/transcript`, {
      method: 'POST',
      headers: {
        'Authorization': ASSEMBLYAI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        language_code: 'en_us',
      }),
    });

    if (!transcriptResponse.ok) {
      throw new Error(`AssemblyAI request failed: ${transcriptResponse.status}`);
    }

    const transcript = await transcriptResponse.json();
    const transcriptId = transcript.id;

    console.log(`[ASSEMBLYAI] Job submitted with ID: ${transcriptId}, polling for results...`);

    // Poll for completion
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const statusResponse = await fetch(`${ASSEMBLYAI_BASE_URL}/transcript/${transcriptId}`, {
        headers: {
          'Authorization': ASSEMBLYAI_API_KEY,
        },
      });

      if (!statusResponse.ok) {
        throw new Error(`Status check failed: ${statusResponse.status}`);
      }

      const status = await statusResponse.json();
      console.log(`[ASSEMBLYAI] Status: ${status.status}`);

      if (status.status === 'completed') {
        console.log(`[ASSEMBLYAI] Transcription completed: ${status.text?.length || 0} characters`);
        return status.text || null;
      } else if (status.status === 'error') {
        throw new Error(`Transcription failed: ${status.error}`);
      }

      attempts++;
    }

    throw new Error('Transcription timed out');

  } catch (error) {
    console.error('[ASSEMBLYAI] Transcription failed:', error);
    return null;
  }
}
