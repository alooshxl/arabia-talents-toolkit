import { Link } from 'react-router-dom';
import { 
  BarChart3, 
  GitCompare, 
  Database, 
  Film, 
  Search, 
  Activity,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

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
    }
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
          <Card key={tool.path} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-2 ${tool.color}`}>
                {tool.icon}
              </div>
              <CardTitle>{tool.title}</CardTitle>
              <CardDescription>{tool.description}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild className="w-full">
                <Link to={tool.path} className="flex items-center justify-center gap-2">
                  Open Tool <ArrowRight size={16} />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

    
    </div>
  );
}

