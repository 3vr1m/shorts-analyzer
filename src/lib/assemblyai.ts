/**
 * AssemblyAI transcription service - works perfectly on Vercel
 * Takes YouTube URLs directly, no downloads needed!
 */

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;
const ASSEMBLYAI_BASE_URL = 'https://api.assemblyai.com/v2';

export async function transcribeWithAssemblyAI(youtubeUrl: string): Promise<string | null> {
  if (!ASSEMBLYAI_API_KEY) {
    console.warn('[ASSEMBLYAI] API key not configured');
    return null;
  }

  try {
    console.log(`[ASSEMBLYAI] Starting transcription for: ${youtubeUrl}`);

    // AssemblyAI can take YouTube URLs directly!
    const transcriptResponse = await fetch(`${ASSEMBLYAI_BASE_URL}/transcript`, {
      method: 'POST',
      headers: {
        'Authorization': ASSEMBLYAI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio_url: youtubeUrl,  // Direct YouTube URL!
        language_code: 'en_us',
        speech_model: 'nano'  // Fastest model for real-time feel
      }),
    });

    if (!transcriptResponse.ok) {
      const errorData = await transcriptResponse.json().catch(() => null);
      throw new Error(`AssemblyAI request failed: ${transcriptResponse.status} - ${errorData?.error || 'Unknown error'}`);
    }

    const transcript = await transcriptResponse.json();
    const transcriptId = transcript.id;

    console.log(`[ASSEMBLYAI] Job submitted with ID: ${transcriptId}, polling for results...`);

    // Poll for completion with exponential backoff
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes max
    let pollInterval = 2000; // Start with 2 seconds
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      
      const statusResponse = await fetch(`${ASSEMBLYAI_BASE_URL}/transcript/${transcriptId}`, {
        headers: {
          'Authorization': ASSEMBLYAI_API_KEY,
        },
      });

      if (!statusResponse.ok) {
        throw new Error(`Status check failed: ${statusResponse.status}`);
      }

      const status = await statusResponse.json();
      console.log(`[ASSEMBLYAI] Status: ${status.status} (attempt ${attempts + 1})`);

      if (status.status === 'completed') {
        console.log(`[ASSEMBLYAI] Transcription completed: ${status.text?.length || 0} characters`);
        return status.text || null;
      } else if (status.status === 'error') {
        throw new Error(`Transcription failed: ${status.error}`);
      }

      attempts++;
      // Exponential backoff: 2s, 3s, 5s, 5s, 5s...
      pollInterval = Math.min(pollInterval * 1.5, 5000);
    }

    throw new Error('Transcription timed out after 10 minutes');

  } catch (error) {
    console.error('[ASSEMBLYAI] Transcription failed:', error);
    throw error; // Re-throw so we can handle it properly
  }
}
