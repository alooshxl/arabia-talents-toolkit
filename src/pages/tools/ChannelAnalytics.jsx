import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/contexts/AppContext';
import youtubeApiService from '@/services/youtubeApi';
import { formatNumber, formatDate, calculateAverageViews, filterVideosByDateRange } from '@/utils/helpers';
import { TrendingUp, TrendingDown, Users, Eye, Video, Calendar } from 'lucide-react';

export default function ChannelAnalytics() {
  const { setLoading, setError } = useAppContext();
  const [channelUrl, setChannelUrl] = useState('');
  const [channelData, setChannelData] = useState(null);
  const [videos, setVideos] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [monthlyBreakdown, setMonthlyBreakdown] = useState([]);

  const handleAnalyze = async () => {
    if (!channelUrl.trim()) return;
    
    setIsAnalyzing(true);
    setLoading(true);
    setError(null);
    
    try {
      // Extract channel ID from URL
      let channelId = youtubeApiService.extractChannelId(channelUrl);
      
      // If not a direct channel ID URL, try to get channel ID from custom URL
      if (!channelId) {
        channelId = await youtubeApiService.getChannelIdFromCustomUrl(channelUrl);
      }
      
      if (!channelId) {
        throw new Error('Could not find a valid channel ID from the provided URL');
      }
      
      // Get channel info
      const channelInfo = await youtubeApiService.getChannelInfo(channelId);
      setChannelData(channelInfo);
      
      // Get channel videos (get more for better analysis)
      const channelVideos = await youtubeApiService.getChannelVideos(channelId, 200);
      
      // Get video details for all videos
      const videoIds = channelVideos.map(video => video.id.videoId);
      const videoDetails = await youtubeApiService.getMultipleVideoDetails(videoIds);
      setVideos(videoDetails);
      
      // Calculate monthly breakdown
      const breakdown = calculateMonthlyBreakdown(videoDetails);
      setMonthlyBreakdown(breakdown);
      
    } catch (error) {
      console.error('Error analyzing channel:', error);
      setError(error.message || 'Failed to analyze channel. Please check the URL and try again.');
    } finally {
      setIsAnalyzing(false);
      setLoading(false);
    }
  };

  // Calculate monthly breakdown
  const calculateMonthlyBreakdown = (videos) => {
    const monthlyData = {};
    
    videos.forEach(video => {
      const publishDate = new Date(video.snippet.publishedAt);
      const monthKey = `${publishDate.getFullYear()}-${String(publishDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          videosPublished: 0,
          totalViews: 0,
          videos: []
        };
      }
      
      monthlyData[monthKey].videosPublished++;
      monthlyData[monthKey].totalViews += parseInt(video.statistics.viewCount || 0);
      monthlyData[monthKey].videos.push(video);
    });
    
    // Calculate average views per video for each month
    Object.keys(monthlyData).forEach(month => {
      const data = monthlyData[month];
      data.avgViewsPerVideo = data.videosPublished > 0 ? Math.round(data.totalViews / data.videosPublished) : 0;
    });
    
    // Sort by month (newest first)
    return Object.values(monthlyData).sort((a, b) => b.month.localeCompare(a.month));
  };

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6">Channel Analytics</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Enter YouTube Channel URL</CardTitle>
          <CardDescription>
            Paste a YouTube channel URL to get detailed analytics and insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="https://www.youtube.com/channel/... or https://www.youtube.com/@..."
              value={channelUrl}
              onChange={(e) => setChannelUrl(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleAnalyze} 
              disabled={isAnalyzing || !channelUrl.trim()}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {channelData && (
        <div className="space-y-6">
          {/* Channel Overview */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <img 
                  src={channelData.snippet.thumbnails.default.url} 
                  alt={channelData.snippet.title}
                  className="w-16 h-16 rounded-full"
                />
                <div>
                  <CardTitle>{channelData.snippet.title}</CardTitle>
                  <CardDescription>{channelData.snippet.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Subscribers</div>
                    <div className="text-2xl font-bold">{formatNumber(channelData.statistics.subscriberCount)}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <Eye className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Total Views</div>
                    <div className="text-2xl font-bold">{formatNumber(channelData.statistics.viewCount)}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <Video className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Total Videos</div>
                    <div className="text-2xl font-bold">{formatNumber(channelData.statistics.videoCount)}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Breakdown */}
          {monthlyBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Monthly Breakdown</CardTitle>
                <CardDescription>
                  Video publishing and performance metrics by month
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Videos Published</TableHead>
                        <TableHead className="text-right">Total Views</TableHead>
                        <TableHead className="text-right">Average Views per Video</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyBreakdown.slice(0, 12).map((month) => (
                        <TableRow key={month.month}>
                          <TableCell className="font-medium">{month.month}</TableCell>
                          <TableCell className="text-right">{month.videosPublished}</TableCell>
                          <TableCell className="text-right">{formatNumber(month.totalViews)}</TableCell>
                          <TableCell className="text-right">{formatNumber(month.avgViewsPerVideo)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

