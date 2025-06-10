import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppContext } from '@/contexts/AppContext';
import youtubeApiService from '@/services/youtubeApi';
import { formatNumber, formatDate, calculateEngagementRate } from '@/utils/helpers';
import { Search, Download, Eye, Calendar } from 'lucide-react';

export default function SearchTool() {
  const { setLoading, setError } = useAppContext();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [uploadDate, setUploadDate] = useState('any');
  const [sortBy, setSortBy] = useState('relevance');
  const [maxResults, setMaxResults] = useState('25');
  const [videoDuration, setVideoDuration] = useState('any');

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setLoading(true);
    setError(null);
    setResults([]);
    
    try {
      const options = {
        maxResults: parseInt(maxResults),
        order: sortBy
      };

      if (uploadDate !== 'any') {
        const now = new Date();
        let publishedAfter;
        
        switch (uploadDate) {
          case 'hour':
            publishedAfter = new Date(now.getTime() - 60 * 60 * 1000);
            break;
          case 'day':
            publishedAfter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case 'week':
            publishedAfter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            publishedAfter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'year':
            publishedAfter = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
        }
        
        if (publishedAfter) {
          options.publishedAfter = publishedAfter.toISOString();
        }
      }

      if (videoDuration !== 'any') {
        options.videoDuration = videoDuration === 'short' ? 'short' : 'long';
      }

      const searchResults = await youtubeApiService.searchVideos(query, options);
      
      const videoIds = searchResults.map(video => video.id.videoId).filter(Boolean);
      const videoDetails = await youtubeApiService.getMultipleVideoDetails(videoIds);
      
      const videosWithChannelInfo = [];
      const channelInfoCache = {};

      for (const video of videoDetails) {
        const channelId = video.snippet.channelId;
        let channelCountry = 'Unknown';

        if (channelId) {
          if (channelInfoCache[channelId]) {
            channelCountry = channelInfoCache[channelId];
          } else {
            try {
              const channelInfo = await youtubeApiService.getChannelInfo(channelId);
              channelCountry = channelInfo.snippet.country || 'Unknown';
              channelInfoCache[channelId] = channelCountry;
            } catch (channelError) {
              console.error(`Error fetching channel info for ${channelId}:`, channelError);
              channelInfoCache[channelId] = 'Unknown';
            }
          }
        }

        videosWithChannelInfo.push({
          ...video,
          channelCountry: channelCountry
        });
      }
      
      setResults(videosWithChannelInfo);
      
    } catch (error) {
      console.error('Error searching videos:', error);
      setError(error.message || 'Failed to search videos. Please try again.');
    } finally {
      setIsSearching(false);
      setLoading(false);
    }
  };

  const parseDuration = (duration) => {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 'N/A';

    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;
    
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;

    if (totalSeconds < 60) {
      return `${seconds}s`;
    } else if (totalSeconds < 3600) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
  };

  const exportToCSV = () => {
    if (results.length === 0) return;

    const headers = [
      'Video Title',
      'Channel Name',
      'Channel Country Code',
      'Video URL',
      'Views',
      'Likes',
      'Comments',
      'Duration',
      'Publish Date',
      'Engagement Rate'
    ];

    const rows = results.map(video => [
      `"${video.snippet.title.replace(/"/g, '""')}"`,
      `"${video.snippet.channelTitle.replace(/"/g, '""')}"`,
      `"${video.channelCountry.replace(/"/g, '""')}"`,
      `"https://www.youtube.com/watch?v=${video.id}"`,
      video.statistics.viewCount,
      video.statistics.likeCount || 0,
      video.statistics.commentCount || 0,
      `"${parseDuration(video.contentDetails.duration).replace(/"/g, '""')}"`,
      `"${formatDate(video.snippet.publishedAt).replace(/"/g, '""')}"`,
      calculateEngagementRate(video)
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'youtube_search_results.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6">YouTube Search Tool</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Search YouTube Videos</CardTitle>
          <CardDescription>
            Search for videos with advanced filters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              placeholder="Enter search query..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Upload Date</label>
                <Select value={uploadDate} onValueChange={setUploadDate}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any time</SelectItem>
                    <SelectItem value="hour">Last hour</SelectItem>
                    <SelectItem value="day">Last 24 hours</SelectItem>
                    <SelectItem value="week">Last week</SelectItem>
                    <SelectItem value="month">Last month</SelectItem>
                    <SelectItem value="year">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Sort By</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevance</SelectItem>
                    <SelectItem value="date">Upload date</SelectItem>
                    <SelectItem value="viewCount">View count</SelectItem>
                    <SelectItem value="rating">Rating</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Results</label>
                <Select value={maxResults} onValueChange={setMaxResults}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 results</SelectItem>
                    <SelectItem value="50">50 results</SelectItem>
                    <SelectItem value="100">100 results</SelectItem>
                    <SelectItem value="200">200 results</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* New Video Duration Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Video Duration</label>
                <Select value={videoDuration} onValueChange={setVideoDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    <SelectItem value="short">Short (&lt;= 60s)</SelectItem>
                    <SelectItem value="full">Full (&gt;= 60s)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button 
              onClick={handleSearch} 
              disabled={isSearching || !query.trim()}
              className="w-full sm:w-auto"
            >
              {isSearching ? 'Searching...' : 'Search Videos'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Search Results</CardTitle>
                <CardDescription>
                  Found {results.length} videos
                </CardDescription>
              </div>
              <Button onClick={exportToCSV} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" /> Export to CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Video Title</TableHead>
                    <TableHead>Channel Name</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Video URL</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                    <TableHead className="text-right">Likes</TableHead>
                    <TableHead className="text-right">Comments</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    <TableHead className="text-right">Publish Date</TableHead>
                    <TableHead className="text-right">Engagement Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((video) => (
                    <TableRow key={video.id}>
                      <TableCell className="font-medium">{video.snippet.title}</TableCell>
                      <TableCell>{video.snippet.channelTitle}</TableCell>
                      <TableCell>{video.channelCountry}</TableCell>
                      <TableCell><a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Link</a></TableCell>
                      <TableCell className="text-right">{formatNumber(video.statistics.viewCount)}</TableCell>
                      <TableCell className="text-right">{formatNumber(video.statistics.likeCount || 0)}</TableCell>
                      <TableCell className="text-right">{formatNumber(video.statistics.commentCount || 0)}</TableCell>
                      <TableCell className="text-right">{parseDuration(video.contentDetails.duration)}</TableCell>
                      <TableCell className="text-right">{formatDate(video.snippet.publishedAt)}</TableCell>
                      <TableCell className="text-right">{calculateEngagementRate(video)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
      {results.length === 0 && !isSearching && query.trim() && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No videos found matching your criteria. Try a different search query or adjust your filters.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

