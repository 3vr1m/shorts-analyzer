/**
 * Gemini AI API integration for script generation
 * Provides AI-powered script creation for influencer content
 */

// Types for Gemini API integration
interface GeminiScriptRequest {
  niche: string;
  topic: string;
}

interface GeminiScriptResponse {
  title: string;
  hooks: string[];
  script: string;
  cta: string;
}

interface GeminiAPIError {
  message: string;
  code?: string;
  status?: number;
}

/**
 * Generates a script using Google's Gemini AI API
 * @param niche - The niche/category for the script
 * @param topic - The specific topic to cover
 * @returns A structured script object optimized for social media
 */
export async function generateScript(
  niche: string, 
  topic: string
): Promise<GeminiScriptResponse> {
  try {
    // Validate inputs
    if (!niche?.trim() || !topic?.trim()) {
      throw new Error('Niche and topic are required');
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    // Prepare the prompt for Gemini
    const prompt = createScriptPrompt(niche.trim(), topic.trim());
    
    // Make API call to Gemini
    const response = await fetchGeminiResponse(apiKey, prompt);
    
    // Parse and validate the response
    const script = parseGeminiResponse(response);
    
    return script;

  } catch (error) {
    console.error('Gemini script generation failed:', error);
    
    // Re-throw the error to be handled by the calling function
    throw new Error(
      error instanceof Error 
        ? error.message 
        : 'Failed to generate script with Gemini AI'
    );
  }
}

/**
 * Creates an optimized prompt for script generation
 */
function createScriptPrompt(niche: string, topic: string): string {
  return `You are an expert social media content creator specializing in ${niche}. 
Create a compelling short-form video script about "${topic}" that will go viral.

Requirements:
- Script should be 2-3 minutes long (approximately 300-400 words)
- Include 5 attention-grabbing hooks for the first 3 seconds
- Structure with clear sections: Intro, Hook, Main Content, Conclusion, Engagement
- Add timing markers for each section
- Make it conversational and engaging
- Include a strong call-to-action
- Optimize for platforms like TikTok, Instagram Reels, and YouTube Shorts

Format the response as a JSON object with these exact keys:
{
  "title": "Script title",
  "hooks": ["hook1", "hook2", "hook3", "hook4", "hook5"],
  "script": "Full script with timing markers",
  "cta": "Call to action text"
}

Focus on ${niche} audience and make ${topic} relatable and actionable.`;
}

/**
 * Makes the actual API call to Gemini
 */
async function fetchGeminiResponse(apiKey: string, prompt: string): Promise<any> {
  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
  
  const response = await fetch(`${endpoint}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Parses and validates the Gemini API response
 */
function parseGeminiResponse(response: any): GeminiScriptResponse {
  try {
    // Extract the generated text from Gemini's response
    const generatedText = response.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      throw new Error('Invalid response format from Gemini API');
    }

    // Try to extract JSON from the response
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in Gemini response');
    }

    const parsedScript = JSON.parse(jsonMatch[0]);

    // Validate the required fields
    if (!parsedScript.title || !parsedScript.hooks || !parsedScript.script || !parsedScript.cta) {
      throw new Error('Missing required fields in generated script');
    }

    // Ensure hooks is an array with at least 3 items
    if (!Array.isArray(parsedScript.hooks) || parsedScript.hooks.length < 3) {
      throw new Error('Invalid hooks format - must be an array with at least 3 items');
    }

    return {
      title: String(parsedScript.title),
      hooks: parsedScript.hooks.map(String),
      script: String(parsedScript.script),
      cta: String(parsedScript.cta)
    };

  } catch (error) {
    console.error('Failed to parse Gemini response:', error);
    throw new Error('Failed to parse AI-generated script response');
  }
}

/**
 * Generates niche suggestions using Gemini AI
 * @param input - User input to base suggestions on
 * @returns Array of niche suggestions
 */
export async function generateNicheSuggestions(input: string): Promise<string[]> {
  try {
    // Validate inputs
    if (!input?.trim()) {
      throw new Error('Input is required');
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }

    // Create prompt for niche suggestions
    const prompt = `Based on the input "${input}", generate 8-10 specific content niche suggestions that would be perfect for short-form video content (YouTube Shorts, Instagram Reels, TikTok). 

Focus on niches that are:
- Trending and engaging
- Suitable for short-form content
- Have good monetization potential
- Appeal to specific audiences

Return only the niche names, one per line, without numbers or bullet points. Be specific and actionable.

Examples of good niches: "Productivity hacks for students", "Quick healthy breakfast recipes", "Home workout routines under 5 minutes"`;

    // Make API call to Gemini
    const response = await fetchGeminiResponse(apiKey, prompt);
    
    // Parse the response to extract niche suggestions
    const generatedText = response.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      throw new Error('Invalid response format from Gemini API');
    }

    // Split by lines and clean up
    const suggestions = generatedText
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0 && !line.match(/^\d+\./))
      .slice(0, 10);

    return suggestions;

  } catch (error) {
    console.error('Gemini niche suggestions failed:', error);
    
    // Return fallback suggestions
    return [
      'Quick productivity tips',
      'Healthy meal prep ideas',
      'Home workout routines',
      'Tech gadget reviews',
      'Personal finance tips',
      'DIY home decor',
      'Travel photography tips',
      'Study techniques for students'
    ];
  }
}

/**
 * Fallback function for when Gemini API is unavailable
 * This provides a basic script structure that can be enhanced
 */
export function generateFallbackScript(niche: string, topic: string): GeminiScriptResponse {
  return {
    title: `${topic} | ${niche} Edition`,
    hooks: [
      `Did you know this simple ${niche.toLowerCase()} trick can change everything?`,
      `I've been doing ${topic.toLowerCase()} wrong my entire life until...`,
      `This ${niche.toLowerCase()} secret will blow your mind!`
    ],
    script: `[INTRO]
Hey everyone! Today we're diving into ${topic} in the ${niche.toLowerCase()} space. 
This is something I've been passionate about for years, and I can't wait to share what I've learned with you.

[MAIN CONTENT]
So here's the thing about ${topic.toLowerCase()} - most people get it completely wrong. 
They think it's just about [insert common misconception], but that's only scratching the surface.

Let me break down the three key points that changed everything for me:

1. First, you need to understand that ${topic.toLowerCase()} isn't just a trend - it's a fundamental shift in how we approach ${niche.toLowerCase()}.

2. Second, the timing matters more than most people realize. You can't just jump in without proper preparation.

3. Finally, consistency beats perfection every single time. I'd rather see you do this imperfectly every day than perfectly once a week.

[CONCLUSION]
The bottom line is this: ${topic} in the ${niche.toLowerCase()} world isn't going anywhere. 
Those who adapt now will be the ones who thrive tomorrow.

What's your experience with ${topic.toLowerCase()}? Drop a comment below and let me know!`,
    cta: `If this helped you understand ${topic.toLowerCase()} better, smash that like button and subscribe for more ${niche.toLowerCase()} content! And don't forget to hit the notification bell so you never miss our latest tips and strategies.`
  };
}
