import { Link } from 'react-router-dom';
import { 
  BarChart3, 
  GitCompare, 
  Database, 
  Film, 
  Search, 
  Activity,
  ArrowRight,
  Sparkles,
  MessageSquareText // Added for Arabia Comment Mapper
  // Users icon removed
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Game from '@/components/game/Game';

export default function Home() {
  const tools = [
    {
      title: 'Channel Analytics',
      description: 'Get detailed analytics for any YouTube channel including subscriber count, views, and recent activity.',
      icon: <BarChart3 size={24} />,
      path: '/tools/channel-analytics',
      color: 'bg-blue-100 dark:bg-blue-900'
    },
    {
      title: 'Channel Comparison',
      description: 'Compare up to 5 YouTube channels side-by-side to analyze performance differences.',
      icon: <GitCompare size={24} />,
      path: '/tools/channel-comparison',
      color: 'bg-purple-100 dark:bg-purple-900'
    },
    {
      title: 'Bulk Channel Analyzer',
      description: 'Analyze dozens of channels at once with filtering options for performance and region.',
      icon: <Database size={24} />,
      path: '/tools/bulk-channel-analyzer',
      color: 'bg-orange-100 dark:bg-orange-900'
    },
    {
      title: 'Bulk Video Analyzer',
      description: 'Process multiple YouTube videos to get views, likes, and other engagement metrics.',
      icon: <Film size={24} />,
      path: '/tools/bulk-video-analyzer',
      color: 'bg-red-100 dark:bg-red-900'
    },
    {
      title: 'Search Tool',
      description: 'Search YouTube with advanced filters for country, views, upload date, and category.',
      icon: <Search size={24} />,
      path: '/tools/search-tool',
      color: 'bg-yellow-100 dark:bg-yellow-900'
    },
    {
      title: 'Trending Checker',
      description: 'Check if videos are trending in Arab countries and get their ranking in Gaming category.',
      icon: <Activity size={24} />,
      path: '/tools/trending-checker',
      color: 'bg-pink-100 dark:bg-pink-900'
    },
    {
      title: 'AI Video Summarizer',
      description: 'Summarize videos in English & Arabic with Gemini + subtitles.',
      icon: <Sparkles size={24} />,
      path: '/tools/ai-video-summarizer',
      color: 'bg-purple-100 dark:bg-purple-900',
    },
    {
      title: 'Arabia Comment Mapper',
      description: 'Analyze YouTube comments to estimate commenter nationality from Arab countries using channel data and AI dialect analysis.',
      icon: <MessageSquareText size={24} />,
      path: '/tools/arabia-comment-mapper',
      color: 'bg-green-100 dark:bg-green-900'
    }
    // Removed Sponsored Content Checker card:
    // {
    //   title: "Sponsored Content Checker",
    //   description: "Detects sponsored content in YouTube video descriptions. (Rebuilt)",
    //   href: "/tools/sponsored-checker",
    //   icon: <Megaphone className="w-8 h-8" />,
    //   color: "bg-sky-100 dark:bg-sky-900",
    // }
    //   title: "Sponsored Content Checker",
    //   description: "Detects sponsored content in YouTube video descriptions. (Rebuilt)",
    //   href: "/tools/sponsored-checker",
    //   icon: <Megaphone className="w-8 h-8" />,
    //   color: "bg-sky-100 dark:bg-sky-900",
    // }
    // Lookalike Finder card object removed
  ];

  return (
    <div className="container mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Arabia Talents YouTube Toolkit</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          A comprehensive suite of tools for YouTube channel and video analytics, designed for Arabia Talents.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => (
          <Card key={tool.path || tool.href} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-2 ${tool.color}`}>
                {tool.icon}
              </div>
              <CardTitle>{tool.title}</CardTitle>
              <CardDescription>{tool.description}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild className="w-full">
                <Link to={tool.path || tool.href} className="flex items-center justify-center gap-2">
                  Open Tool <ArrowRight size={16} />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div id="pubgmini-game-section" className="mt-12 text-center">
        <h2 className="text-3xl font-bold mb-4">Try our Mini Game!</h2>
        <div className="flex justify-center p-4">
          <Card className="w-full max-w-2xl overflow-hidden">
            <CardContent className="p-0">
              <Game />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
