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
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  
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
    let parsedScript: any | null = null;
    if (jsonMatch) {
      try {
        parsedScript = JSON.parse(jsonMatch[0]);
      } catch {}
    }

    // If JSON parsed correctly and has expected fields
    if (parsedScript && parsedScript.title && parsedScript.hooks && parsedScript.script) {
      return {
        title: String(parsedScript.title),
        hooks: parsedScript.hooks.map(String),
        script: String(parsedScript.script),
        cta: String(parsedScript.cta || '')
      };
    }

    // Fallback: build a script object from plain text
    const lines = generatedText.split('\n').map((l: string) => l.trim()).filter(Boolean);
    const title = lines[0]?.replace(/^#+\s*/, '') || 'Generated Script';
    const hooks: string[] = [];
    for (const l of lines.slice(1)) {
      if (hooks.length >= 5) break;
      if (/^[-*•]/.test(l) || l.length <= 120) hooks.push(l.replace(/^[-*•]\s*/, ''));
    }
    const ctaLine = lines.find((l: string) => /call\s*to\s*action|cta/i.test(l)) || '';
    return {
      title,
      hooks: hooks.length ? hooks : ["Here's why this matters", "Don’t miss this part", "The quick win"],
      script: generatedText,
      cta: ctaLine
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
    const prompt = `You are a senior content strategist.
Based on this brief: ${input}
Generate 10 sharp, marketable NICHES (not video titles). Each niche should be 3-6 words, reflect a clear audience + angle, and be suitable for short-form content.
Output JSON ONLY with: {"niches":[{"name":"string"}...]}`;

    // Make API call to Gemini
    const response = await fetchGeminiResponse(apiKey, prompt);
    
    // Parse the response to extract niche suggestions
    const generatedText = response.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      throw new Error('Invalid response format from Gemini API');
    }

    // Split by lines and clean up
    // Prefer JSON if model returned JSON
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.niches)) {
          return parsed.niches.map((n: any) => String(n.name || n));
        }
        if (Array.isArray(parsed.suggestions)) {
          return parsed.suggestions.map((s: any) => String(s.name || s));
        }
      } catch {}
    }
    // Fallback: parse line list
    const suggestions = generatedText
      .split('\n')
      .map((line: string) => line.replace(/^[-*\d.\s]+/, '').trim())
      .filter((line: string) => line.length > 0)
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

// Full niche strategy generator (returns structured object)
export async function generateNicheStrategy(input: string): Promise<{
  niche_description: string;
  target_audience: string;
  trending_topics: string[];
  content_pillars: string[];
  content_ideas: { title: string; pillar: string; format: string }[];
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini API key not configured');

  const prompt = `You are a senior content strategist and creative visionary.
Analyze the user's brief below and output a complete, actionable content strategy as a single JSON object only.

User brief:
${input}

Generate:
1) niche_description: one sentence; clearly state topic, audience, goal/angle.
2) target_audience: one detailed paragraph (interests, pain points, motivations, what content they seek).
3) trending_topics: 5-7 popular, highly searchable keywords or topics in this niche.
4) content_pillars: 3 distinct pillars that cover the niche broadly and cohesively.
5) content_ideas: 6 short-form ideas (JSON objects) with keys: title, pillar, format ("Short-form").

Output JSON ONLY with keys: {"niche_description","target_audience","trending_topics","content_pillars","content_ideas"}`;

  const response = await fetchGeminiResponse(apiKey, prompt);
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Try JSON block parse
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      // Basic normalization
      parsed.trending_topics = Array.isArray(parsed.trending_topics) ? parsed.trending_topics : [];
      parsed.content_pillars = Array.isArray(parsed.content_pillars) ? parsed.content_pillars : [];
      parsed.content_ideas = Array.isArray(parsed.content_ideas) ? parsed.content_ideas : [];
      return parsed;
    } catch {}
  }

  // Fallback: construct minimal viable structure from plaintext
  const lines: string[] = text.split('\n').map((l: string) => l.trim()).filter(Boolean) as string[];
  const fallback = {
    niche_description: lines.find((l: string) => l.length > 20) || 'A focused niche with short-form potential.',
    target_audience: lines.slice(1, 4).join(' ') || 'People actively seeking concise, practical content in this area.',
    trending_topics: lines.filter((l: string) => l.length < 60).slice(0, 7),
    content_pillars: lines.filter((l: string) => l.length < 40).slice(0, 3),
    content_ideas: [] as { title: string; pillar: string; format: string }[],
  };
  const pillars = fallback.content_pillars.length ? fallback.content_pillars : ['Pillar A', 'Pillar B', 'Pillar C'];
  for (let i = 0; i < 6; i++) {
    const p = pillars[i % pillars.length];
    fallback.content_ideas.push({ title: `Why ${p} matters right now`, pillar: p, format: 'Short-form' });
  }
  return fallback;
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
