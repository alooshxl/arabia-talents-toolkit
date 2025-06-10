import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useAppContext } from '@/contexts/AppContext';
import youtubeApiService from '@/services/youtubeApi';
import { formatNumber, formatDate, parseBulkInput, extractVideoId } from '@/utils/helpers';
import { Activity, Check, X, Trophy, Download, Flag, Clock, Eye, ThumbsUp, MessageCircle } from 'lucide-react';

export default function TrendingChecker() {
  const { setLoading, setError } = useAppContext();
  const [videoUrls, setVideoUrls] = useState('');
  const [trendingResults, setTrendingResults] = useState([]);
  const [isChecking, setIsChecking] = useState(false);
  const [showOnlyTrending, setShowOnlyTrending] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);
  
  // All Arab countries as per requirements
  const regions = [
    { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
    { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
    { code: 'IQ', name: 'Iraq', flag: '🇮🇶' },
    { code: 'DZ', name: 'Algeria', flag: '🇩🇿' },
    { code: 'MA', name: 'Morocco', flag: '🇲🇦' },
    { code: 'LY', name: 'Libya', flag: '🇱🇾' },
    { code: 'SY', name: 'Syria', flag: '🇸🇾' },
    { code: 'TN', name: 'Tunisia', flag: '🇹🇳' },
    { code: 'JO', name: 'Jordan', flag: '🇯🇴' },
    { code: 'LB', name: 'Lebanon', flag: '🇱🇧' },
    { code: 'SD', name: 'Sudan', flag: '🇸🇩' },
    { code: 'QA', name: 'Qatar', flag: '🇶🇦' },
    { code: 'KW', name: 'Kuwait', flag: '🇰🇼' },
    { code: 'AE', name: 'UAE', flag: '🇦🇪' },
    { code: 'OM', name: 'Oman', flag: '🇴🇲' },
    { code: 'YE', name: 'Yemen', flag: '🇾🇪' },
    { code: 'BH', name: 'Bahrain', flag: '🇧🇭' },
    { code: 'PS', name: 'Palestine', flag: '🇵🇸' }
  ];

  const handleCheck = async () => {
    if (!videoUrls.trim()) return;
    
    setIsChecking(true);
    setLoading(true);
    setError(null);
    setTrendingResults([]);
    
    try {
      // Parse bulk input
      const urls = parseBulkInput(videoUrls);
      
      if (urls.length === 0) {
        throw new Error('No valid URLs provided');
      }
      
      // Get trending videos for Gaming category (ID 20) for each region
      const trendingVideosByRegion = {};
      
      for (const region of regions) {
        try {
          // Get top 50 trending videos in Gaming category for this region
          const trendingVideos = await youtubeApiService.getTrendingVideos(region.code, '20', 50);
          trendingVideosByRegion[region.code] = trendingVideos.map(video => video.id);
        } catch (error) {
          console.error(`Error fetching trending videos for ${region.name}:`, error);
          trendingVideosByRegion[region.code] = null; // null indicates data unavailable
        }
      }
      
      // Process each video
      const results = [];
      
      for (const url of urls) {
        try {
          // Extract video ID
          const videoId = extractVideoId(url);
          
          if (!videoId) {
            console.error(`Could not extract video ID from URL: ${url}`);
            continue;
          }
          
          // Get video details
          const videoDetails = await youtubeApiService.getVideoDetails(videoId);
          
          // Check trending status in each region
          const trendingStatus = {};
          const currentlyTrendingIn = [];
          
          for (const region of regions) {
            const trendingVideos = trendingVideosByRegion[region.code];
            
            if (trendingVideos === null) {
              // Data unavailable
              trendingStatus[region.code] = {
                trending: false,
                rank: null,
                regionName: region.name,
                flag: region.flag,
                status: 'unavailable'
              };
            } else {
              const trendingIndex = trendingVideos.indexOf(videoId);
              const isTrending = trendingIndex !== -1;
              
              trendingStatus[region.code] = {
                trending: isTrending,
                rank: isTrending ? trendingIndex + 1 : null,
                regionName: region.name,
                flag: region.flag,
                status: isTrending ? 'trending' : 'not_trending'
              };
              
              if (isTrending) {
                currentlyTrendingIn.push({
                  code: region.code,
                  name: region.name,
                  flag: region.flag,
                  rank: trendingIndex + 1
                });
              }
            }
          }
          
          results.push({
            videoId,
            videoDetails,
            trendingStatus,
            currentlyTrendingIn,
            url
          });
        } catch (error) {
          console.error(`Error processing video URL: ${url}`, error);
        }
      }
      
      setTrendingResults(results);
      setLastChecked(new Date());
      
    } catch (error) {
      console.error('Error checking trending status:', error);
      setError(error.message || 'Failed to check trending status. Please try again.');
    } finally {
      setIsChecking(false);
      setLoading(false);
    }
  };

  // Export results to CSV
  const exportToCSV = () => {
    if (trendingResults.length === 0) return;
    
    const headers = [
      'Video Title',
      'Channel',
      'Views',
      'Likes',
      'Comments',
      'Published Date',
      ...regions.flatMap(region => [
        `Trending in ${region.name}`,
        `${region.name} Rank`
      ]),
      'URL'
    ];
    
    const rows = trendingResults.map(result => {
      const video = result.videoDetails;
      const regionData = regions.flatMap(region => {
        const status = result.trendingStatus[region.code];
        return [
          status.status === 'trending' ? 'Yes' : status.status === 'unavailable' ? 'Data Unavailable' : 'No',
          status.rank || ''
        ];
      });
      
      return [
        `"${video.snippet.title.replace(/"/g, '""')}"`,
        `"${video.snippet.channelTitle.replace(/"/g, '""')}"`,
        video.statistics.viewCount,
        video.statistics.likeCount || 0,
        video.statistics.commentCount || 0,
        video.snippet.publishedAt,
        ...regionData,
        result.url
      ].join(',');
    });
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'trending_status_gaming.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter regions based on toggle
  const getFilteredRegions = (trendingStatus) => {
    if (!showOnlyTrending) return regions;
    return regions.filter(region => trendingStatus[region.code]?.trending);
  };

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6">Video Trending Checker</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Enter YouTube Video URLs</CardTitle>
          <CardDescription>
            Check if videos are trending in Gaming category (Top 50) across Arab countries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              placeholder="https://www.youtube.com/watch?v=...\nhttps://youtu.be/..."
              value={videoUrls}
              onChange={(e) => setVideoUrls(e.target.value)}
              className="min-h-32"
            />
            <Button 
              onClick={handleCheck} 
              disabled={isChecking || !videoUrls.trim()}
              className="w-full sm:w-auto"
            >
              {isChecking ? 'Checking...' : 'Check Trending Status'}
            </Button>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Checks against Top 50 trending Gaming videos in 18 Arab countries
          </div>
        </CardContent>
      </Card>

      {trendingResults.length > 0 && (
        <div className="space-y-6">
          {trendingResults.map((result) => {
            const video = result.videoDetails;
            const isTrendingAnywhere = result.currentlyTrendingIn.length > 0;
            
            return (
              <Card key={result.videoId} className={isTrendingAnywhere ? 'border-primary' : ''}>
                <CardContent className="p-6">
                  {/* Video Info Card (Top Section) */}
                  <div className="flex flex-col md:flex-row gap-6 mb-6">
                    <img 
                      src={video.snippet.thumbnails.medium.url} 
                      alt={video.snippet.title}
                      className="w-full md:w-64 rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="font-bold text-xl mb-2">{video.snippet.title}</h3>
                      <p className="text-muted-foreground mb-3">{video.snippet.channelTitle}</p>
                      <div className="flex flex-wrap gap-6 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <Eye size={16} />
                          <span>{formatNumber(video.statistics.viewCount)} views</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ThumbsUp size={16} />
                          <span>{formatNumber(video.statistics.likeCount || 0)} likes</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle size={16} />
                          <span>{formatNumber(video.statistics.commentCount || 0)} comments</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={16} />
                          <span>Published {formatDate(video.snippet.publishedAt)}</span>
                        </div>
                      </div>
                      
                      <a 
                        href={result.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        View on YouTube
                      </a>
                    </div>
                  </div>

                  {/* Currently Trending In Section */}
                  {result.currentlyTrendingIn.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-lg">Currently Trending In</h4>
                        {lastChecked && (
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock size={14} />
                            Last checked: {lastChecked.toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {result.currentlyTrendingIn.map((country) => (
                          <div 
                            key={country.code}
                            className="bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-2"
                          >
                            <span className="text-lg">{country.flag}</span>
                            <div>
                              <div className="font-medium text-green-800 dark:text-green-200">
                                {country.code}
                              </div>
                              <div className="text-sm text-green-600 dark:text-green-300">
                                {country.name}
                              </div>
                              <div className="text-xs text-green-600 dark:text-green-400">
                                Rank #{country.rank} of 50
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status in All Arab Countries Section */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-lg">Status in All Arab Countries</h4>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={showOnlyTrending}
                          onCheckedChange={setShowOnlyTrending}
                          id="show-trending-only"
                        />
                        <label htmlFor="show-trending-only" className="text-sm">
                          Show only trending countries
                        </label>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {getFilteredRegions(result.trendingStatus).map((region) => {
                        const status = result.trendingStatus[region.code];
                        
                        let bgColor, textColor, statusText, icon;
                        
                        if (status.status === 'trending') {
                          bgColor = 'bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800';
                          textColor = 'text-green-800 dark:text-green-200';
                          statusText = `Trending #${status.rank}`;
                          icon = '🟢';
                        } else if (status.status === 'unavailable') {
                          bgColor = 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
                          textColor = 'text-yellow-800 dark:text-yellow-200';
                          statusText = 'Data unavailable';
                          icon = '🟡';
                        } else {
                          bgColor = 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
                          textColor = 'text-gray-600 dark:text-gray-400';
                          statusText = 'Not trending';
                          icon = '⚪';
                        }
                        
                        return (
                          <div 
                            key={region.code}
                            className={`p-3 rounded-lg border ${bgColor}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{region.flag}</span>
                                <div>
                                  <div className="font-medium text-sm">{region.code}</div>
                                  <div className="text-xs text-muted-foreground">{region.name}</div>
                                </div>
                              </div>
                              <span className="text-sm">{icon}</span>
                            </div>
                            
                            <div className={`text-sm font-medium ${textColor}`}>
                              {statusText}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Export Button */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-medium">Export Results</h4>
                  <p className="text-sm text-muted-foreground">
                    Download trending status data for all {trendingResults.length} videos
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={exportToCSV}
                  disabled={trendingResults.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export to CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

