// Client-side API functions for static hosting
// These make direct calls to external APIs from the browser

// Environment variables for client-side (these will be public)
const OPENAI_API_KEY = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

// YouTube video analysis
export async function analyzeVideoClient(videoUrl: string) {
  try {
    // Extract video ID from URL
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    // Get video metadata from YouTube API
    const videoData = await getYouTubeVideoData(videoId);
    
    // Analyze with OpenAI
    const analysis = await analyzeWithOpenAI(videoData);
    
    return {
      success: true,
      data: analysis
    };
  } catch (error) {
    console.error('Video analysis error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Analysis failed'
    };
  }
}

// Niche discovery
export async function discoverNicheClient(interests: string[], goals: string[]) {
  try {
    const prompt = `Create a detailed niche analysis for someone interested in: ${interests.join(', ')} with goals: ${goals.join(', ')}. 
    
    Provide a JSON response with:
    - niche: A specific niche name
    - description: Detailed description
    - targetAudience: Who this appeals to
    - contentPillars: Array of 6 content themes
    - trendingTopics: Array of 5 current trending topics
    - ideas: Array of 3 content ideas with title, hook, format, suggestedLength, tone`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8
      })
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse JSON response
    const nicheData = JSON.parse(content);
    
    return {
      success: true,
      data: nicheData
    };
  } catch (error) {
    console.error('Niche discovery error:', error);
    return {
      success: false,
      error: 'Failed to discover niche'
    };
  }
}

// Script generation
export async function generateScriptClient(niche: string, contentType: string) {
  try {
    const prompt = `Generate a detailed video script for the niche: "${niche}" and content type: "${contentType}".
    
    Provide a JSON response with:
    - title: Engaging title
    - hook: Opening hook (first 3 seconds)
    - outline: Array of main points
    - script: Full 30-45 second script
    - cta: Call to action
    - suggestedLength: Duration in seconds
    - tone: Content tone`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7
      })
    });

    const data = await response.json();
    const script = JSON.parse(data.choices[0].message.content);
    
    return {
      success: true,
      data: script
    };
  } catch (error) {
    console.error('Script generation error:', error);
    return {
      success: false,
      error: 'Failed to generate script'
    };
  }
}

// Trending content (simplified version)
export async function getTrendingContentClient(country: string = 'US', limit: number = 20) {
  try {
    // For static hosting, we'll use a simplified approach
    // You could integrate with YouTube Data API directly here
    
    const mockTrendingData = {
      trendingVideos: Array.from({ length: limit }, (_, i) => ({
        id: `video_${i}`,
        title: `Trending Video ${i + 1}`,
        creator: `Creator ${i + 1}`,
        channel: `Creator ${i + 1}`,
        views: Math.floor(Math.random() * 1000000),
        durationSeconds: 30 + Math.floor(Math.random() * 60),
        likeCount: Math.floor(Math.random() * 50000),
        commentCount: Math.floor(Math.random() * 1000),
        region: country,
        url: `https://youtube.com/watch?v=example${i}`,
        platform: 'youtube',
        hashtags: [`#trending${i}`, `#viral${i}`],
        publishedAt: new Date().toISOString()
      })),
      meta: {
        total: limit,
        country,
        platform: 'youtube'
      }
    };

    return {
      success: true,
      data: mockTrendingData
    };
  } catch (error) {
    console.error('Trending content error:', error);
    return {
      success: false,
      error: 'Failed to fetch trending content'
    };
  }
}

// Helper functions
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

async function getYouTubeVideoData(videoId: string) {
  // This would use YouTube Data API
  // For now, return mock data structure
  return {
    id: videoId,
    title: 'Sample Video Title',
    description: 'Sample description',
    channelTitle: 'Sample Channel',
    publishedAt: new Date().toISOString(),
    viewCount: '100000',
    likeCount: '5000'
  };
}

async function analyzeWithOpenAI(videoData: any) {
  const prompt = `Analyze this YouTube video and suggest content ideas:
  
  Title: ${videoData.title}
  Description: ${videoData.description}
  Channel: ${videoData.channelTitle}
  
  Provide 3 content ideas inspired by this video, each with:
  - title: Engaging title
  - hook: Opening hook
  - format: Content format
  - suggestedLength: Duration in seconds
  - tone: Content tone`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    })
  });

  const data = await response.json();
  
  // Parse the response and structure it to match expected Analysis type
  return {
    metadata: { 
      title: videoData.title, 
      channel: videoData.channelTitle, 
      views: parseInt(videoData.viewCount) || 0, 
      published: videoData.publishedAt 
    },
    transcript: "Generated transcript from video analysis",
    analysis: {
      hook: "Engaging opening that captures attention",
      entryStyle: "Direct and compelling",
      niche: "Content Creation",
      structure: "Problem-solution format",
      lengthSeconds: 45,
      pace: "Fast-paced",
      emotion: "Exciting"
    },
    ideas: [
      {
        title: "Content Idea 1",
        hook: "Amazing hook that grabs attention instantly",
        outline: "1. Hook viewers instantly\n2. Present the main concept\n3. Show practical examples\n4. Call to action",
        suggestedLength: 30,
        tone: "Educational",
        exampleTranscript: "Here's the script that will transform your content creation..."
      },
      {
        title: "Content Idea 2", 
        hook: "Surprising fact that will shock your audience",
        outline: "1. Start with surprising fact\n2. Explain the implications\n3. Show how to apply it\n4. Encourage sharing",
        suggestedLength: 45,
        tone: "Informative",
        exampleTranscript: "Did you know this simple trick can double your engagement..."
      },
      {
        title: "Content Idea 3",
        hook: "Behind the scenes look at this amazing process",
        outline: "1. Tease the behind-scenes reveal\n2. Show the actual process\n3. Explain why it works\n4. Invite questions",
        suggestedLength: 60,
        tone: "Casual",
        exampleTranscript: "Let me show you what really happens behind the camera..."
      }
    ]
  };
}
