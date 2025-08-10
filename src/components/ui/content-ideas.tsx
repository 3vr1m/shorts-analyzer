import Link from "next/link";

export interface ContentIdea {
  title: string;
  hook: string;
  format?: string;
  outline?: string;
  suggestedLength?: number;
  tone?: string;
  exampleTranscript?: string;
}

interface ContentIdeasProps {
  ideas: ContentIdea[];
  title?: string;
  showFormat?: boolean;
  showScript?: boolean;
  showActions?: boolean;
  niche?: string;
  className?: string;
}

export function ContentIdeas({
  ideas,
  title = "Content Ideas",
  showFormat = true,
  showScript = false,
  showActions = true,
  niche,
  className = ""
}: ContentIdeasProps) {
  return (
    <div className={`bg-card border border-default rounded-lg p-8 ${className}`}>
      <h3 className="text-2xl font-semibold mb-8 font-inter text-purple-600 dark:text-purple-400">
        {title}
      </h3>
      
      <div className="space-y-6">
        {ideas.map((idea, index) => (
          <div key={index} className="border border-default rounded-lg p-5 bg-card">
            <div className="flex items-start justify-between mb-4">
              <h4 className="font-bold text-purple-600 dark:text-purple-400 text-xl flex-1">{idea.title}</h4>
              <div className="flex gap-2 ml-4">
                {idea.suggestedLength && (
                  <span className="text-base bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-full font-bold shadow-lg">
                    {idea.suggestedLength}s
                  </span>
                )}
                {idea.tone && (
                  <span className="text-base bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-full capitalize font-bold shadow-lg">
                    {idea.tone}
                  </span>
                )}
              </div>
            </div>
            
            <p className="text-lg text-purple-600 dark:text-purple-400 italic mb-4 leading-relaxed font-medium">"{idea.hook}"</p>
            
            {showFormat && idea.format && (
              <span className="inline-block px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-lg rounded-lg font-bold mb-4 shadow-lg">
                {idea.format}
              </span>
            )}
            
            {idea.outline && (
              <div className="mb-4">
                <div className="text-sm font-medium text-foreground mb-2">Content Outline:</div>
                <div className="text-sm text-foreground leading-relaxed whitespace-pre-line bg-muted p-3 rounded border">
                  {idea.outline}
                </div>
              </div>
            )}
            
            {showScript && idea.exampleTranscript && (
              <div className="mb-4">
                <div className="text-sm font-medium text-foreground mb-2">Example Script:</div>
                <div className="text-sm text-foreground leading-relaxed whitespace-pre-line bg-muted p-3 rounded border max-h-48 overflow-y-auto">
                  {idea.exampleTranscript}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {showActions && niche && (
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link
            href={`/script-writer?niche=${encodeURIComponent(niche)}`}
            className="flex-1 px-6 py-3 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/80 transition-colors flex items-center justify-center gap-2"
          >
            Generate Full Scripts 📝
          </Link>
          <Link
            href={`/trends?niche=${encodeURIComponent(niche)}`}
            className="flex-1 px-6 py-3 bg-muted text-muted-foreground rounded-lg font-medium hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-center gap-2 border border-default"
          >
            Explore Trending Content 📈
          </Link>
        </div>
      )}
    </div>
  );
}
