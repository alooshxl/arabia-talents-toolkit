import { Link, useLocation } from 'react-router-dom';
import { 
  BarChart3, 
  GitCompare, 
  Database, 
  Film, 
  Search, 
  Activity,
  MessageSquareText, // Icon for Arabia Comment Mapper
  Gamepad2, // Added Gamepad2
  Clapperboard
  // Users icon removed as it was assumed to be only for Lookalike Finder
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Sidebar() {
  const location = useLocation();

  const navItems = [
    {
      name: 'Channel Analytics',
      path: '/tools/channel-analytics',
      icon: <BarChart3 size={20} />
    },
    {
      name: 'Channel Comparison',
      path: '/tools/channel-comparison',
      icon: <GitCompare size={20} />
    },
    {
      name: 'Bulk Channel Analyzer',
      path: '/tools/bulk-channel-analyzer',
      icon: <Database size={20} />
    },
    {
      name: 'Bulk Video Analyzer',
      path: '/tools/bulk-video-analyzer',
      icon: <Film size={20} />
    },
    {
      name: 'Search Tool',
      path: '/tools/search-tool',
      icon: <Search size={20} />
    },
    // Lookalike Finder removed from navItems
    {
      name: 'Trending Checker',
      path: '/tools/trending-checker',
      icon: <Activity size={20} />
    },
    {

      name: 'Arabia Comment Mapper',
      path: '/tools/arabia-comment-mapper',
      icon: <MessageSquareText size={20} />
    },
    {
      name: 'AI Video Summarizer',
      path: '/tools/ai-video-summarizer',
      icon: <Clapperboard size={20} />
    },
    {
      name: 'PUBGMini', // Renamed
      path: '/#pubgmini-game-section',
      icon: <Gamepad2 size={20} /> // Icon remains
    }
    // Removed Sponsored Content Checker item:
    // {
    //   title: "Sponsored Content Checker",
    //   href: "/tools/sponsored-checker",
    //   icon: <Megaphone size={20} />,
    //   label: "New", // Optional
    // }
    //   title: "Sponsored Content Checker",
    //   href: "/tools/sponsored-checker",
    //   icon: <Megaphone size={20} />,
    //   label: "New", // Optional
    // }
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 border-r bg-background h-[calc(100vh-4rem)] sticky top-16">
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Tools</h2>
        <nav>
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path || item.href}>
                <Link
                  to={item.path || item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    location.pathname === (item.path || item.href) // Ensure comparison works for both path and href
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {item.icon}
                  <span>{item.title || item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="mt-auto p-4 border-t">
        <div className="text-xs text-muted-foreground">
          <p>Arabia Talents YouTube Toolkit</p>
          <p>© 2025 Arabia Talents</p>
        </div>
      </div>
    </aside>
  );
}
