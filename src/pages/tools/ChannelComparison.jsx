import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/contexts/AppContext';
import youtubeApiService from '@/services/youtubeApi';
import { formatNumber, formatDate, parseBulkInput, calculateAverageViews, filterVideosByDateRange } from '@/utils/helpers';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Flame, DollarSign, TrendingUp, Users, Eye, Video } from 'lucide-react';

export default function ChannelComparison() {
  const { setLoading, setError } = useAppContext();
  const [channelUrls, setChannelUrls] = useState('');
  const [channelsData, setChannelsData] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [channelPrices, setChannelPrices] = useState({});

  const handleAnalyze = async () => {
    let specificErrorHandled = false; // 1. Initialize flag
    if (!channelUrls.trim()) return;
    
    setIsAnalyzing(true);
    setLoading(true);
    setError(null); // Clear previous errors
    setChannelsData([]); // Clear previous results
    
    try {
      // Parse bulk input
      const urls = parseBulkInput(channelUrls);
      
      if (urls.length === 0) {
        throw new Error('No valid URLs provided');
      }
      
      if (urls.length > 5) {
        throw new Error('Maximum 5 channels can be compared at once');
      }
      
      // Process each channel
      const results = [];
      
      for (const url of urls) {
        try {
          // Extract channel ID from URL
          let channelId = youtubeApiService.extractChannelId(url);
          
          // If not a direct channel ID URL, try to get channel ID from custom URL
          if (!channelId) {
            channelId = await youtubeApiService.getChannelIdFromCustomUrl(url);
          }
          
          if (!channelId) {
            console.error(`Could not find a valid channel ID for URL: ${url}`);
            continue;
          }
          
          // Get channel info
          const channelInfo = await youtubeApiService.getChannelInfo(channelId);
          
          // Get channel videos (get more for better analysis)
          const channelVideos = await youtubeApiService.getChannelVideos(channelId, 100);
          
          // Get video details for all videos
          const videoIds = channelVideos.map(video => video.id.videoId);
          const videoDetails = await youtubeApiService.getMultipleVideoDetails(videoIds);
          
          // Calculate metrics for different time periods
          const last30DaysVideos = filterVideosByDateRange(videoDetails, '30days');
          const last3MonthsVideos = filterVideosByDateRange(videoDetails, '3months');
          const last12MonthsVideos = filterVideosByDateRange(videoDetails, '12months');
          
          const avgViewsLast30Days = calculateAverageViews(last30DaysVideos);
          const avgViewsLast3Months = calculateAverageViews(last3MonthsVideos);
          const avgViewsLast12Months = calculateAverageViews(last12MonthsVideos);
          const avgViewsOverall = calculateAverageViews(videoDetails);
          
          // Calculate estimated channel price (rough estimation based on subscribers and engagement)
          const subscribers = parseInt(channelInfo.statistics.subscriberCount);
          const totalViews = parseInt(channelInfo.statistics.viewCount);
          const videoCount = parseInt(channelInfo.statistics.videoCount);
          
          // Rough estimation: $1-5 per 1000 subscribers + engagement factor
          const basePrice = (subscribers / 1000) * 2.5;
          const engagementFactor = avgViewsOverall / subscribers;
          const estimatedPrice = basePrice * (1 + engagementFactor);
          
          // Initialize custom price with estimated price
          setChannelPrices(prev => ({
            ...prev,
            [channelId]: estimatedPrice
          }));
          
          results.push({
            channelId,
            channelInfo,
            videos: videoDetails,
            metrics: {
              subscribers,
              totalViews,
              videoCount,
              avgViewsOverall,
              avgViewsLast30Days,
              avgViewsLast3Months,
              avgViewsLast12Months,
              estimatedPrice,
              viewsPerSub: totalViews / subscribers
            }
          });
        } catch (error) {
          console.error(`Error processing channel URL: ${url}`, error);
        }
      }
      
      setChannelsData(results);
      
      // If results is empty here, it means all individual channels failed processing
      // The check in `finally` will handle this.

    } catch (error) {
      specificErrorHandled = true; // 2. Set flag in outer catch
      console.error('Error comparing channels:', error);
      setError(error.message || 'Failed to compare channels. Please check the URLs and try again.');
    } finally {
      // 4. Add logic in finally
      // This check uses the component's state variable `channelsData`.
      if (!specificErrorHandled && channelsData.length === 0) {
        setError("No data found for any of the provided channels or an API error occurred. Please check the URLs and try again.");
      }
      setIsAnalyzing(false);
      setLoading(false);
    }
  };

  // Update channel price
  const updateChannelPrice = (channelId, price) => {
    setChannelPrices(prev => ({
      ...prev,
      [channelId]: parseFloat(price) || 0
    }));
  };

  // Calculate CPV based on custom price
  const calculateCPV = (channelId, avgViews12Months) => {
    const price = channelPrices[channelId] || 0;
    if (avgViews12Months === 0) return 0;
    return price / avgViews12Months;
  };

  // Format number with K suffix
  const formatNumberWithK = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Format CPV with 5 decimal places
  const formatCPV = (cpv) => {
    if (cpv === 0) return '—';
    return `$${cpv.toFixed(5)}`;
  };

  // Get CPV color based on value
  const getCPVColor = (cpv) => {
    if (cpv === 0) return 'bg-gray-100 text-gray-600';
    if (cpv < 0.01) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (cpv < 0.05) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  };

  // Predefined price buttons
  const priceButtons = [500, 1000, 1500, 2000, 3000, 5000];

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6">YouTube Channel Comparison</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Enter YouTube Channel URLs</CardTitle>
          <CardDescription>
            Paste 2-5 YouTube channel URLs (one per line) to compare their metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              placeholder="https://www.youtube.com/channel/...\nhttps://www.youtube.com/c/...\nhttps://www.youtube.com/@..."
              value={channelUrls}
              onChange={(e) => setChannelUrls(e.target.value)}
              className="min-h-32"
            />
            <Button 
              onClick={handleAnalyze} 
              disabled={isAnalyzing || !channelUrls.trim()}
              className="w-full sm:w-auto"
            >
              {isAnalyzing ? 'Analyzing...' : 'Compare Channels'}
            </Button>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Supports channel URLs in formats: /channel/ID, /c/name, or /@handle
          </div>
        </CardContent>
      </Card>

      {channelsData.length > 0 && (
        <div className="space-y-6">
          {/* Card-based layout for channel comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {channelsData.map((channel) => {
              const customPrice = channelPrices[channel.channelId] || channel.metrics.estimatedPrice;
              const cpv = calculateCPV(channel.channelId, channel.metrics.avgViewsLast12Months);
              
              return (
                <Card key={channel.channelId} className="overflow-hidden">
                  <CardContent className="p-6">
                    {/* Top Section */}
                    <div className="flex items-center gap-3 mb-4">
                      <img 
                        src={channel.channelInfo.snippet.thumbnails.default.url} 
                        alt={channel.channelInfo.snippet.title}
                        className="w-12 h-12 rounded-full"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg truncate">
                          {channel.channelInfo.snippet.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {formatNumber(channel.metrics.subscribers)} subscribers
                        </p>
                      </div>
                    </div>

                    {/* Views Section */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">Avg. Views (30d)</div>
                        <div className="font-semibold text-blue-700 dark:text-blue-300">
                          {formatNumberWithK(channel.metrics.avgViewsLast30Days)}
                        </div>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">Avg. Views (12m)</div>
                        <div className="font-semibold text-purple-700 dark:text-purple-300">
                          {formatNumberWithK(channel.metrics.avgViewsLast12Months)}
                        </div>
                      </div>
                    </div>

                    {/* Pricing Section */}
                    <div className="mb-4">
                      <label className="text-sm font-medium mb-2 block">Channel Price (USD)</label>
                      <Input
                        type="number"
                        value={customPrice}
                        onChange={(e) => updateChannelPrice(channel.channelId, e.target.value)}
                        className="mb-2"
                        placeholder="Enter custom price"
                      />
                      <div className="flex flex-wrap gap-1">
                        {priceButtons.map((price) => (
                          <Button
                            key={price}
                            variant="outline"
                            size="sm"
                            onClick={() => updateChannelPrice(channel.channelId, price)}
                            className="text-xs"
                          >
                            ${price}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* CPV Section */}
                    <div className={`p-3 rounded-lg ${getCPVColor(cpv)}`}>
                      <div className="text-xs font-medium mb-1">Cost Per View (CPV)</div>
                      <div className="font-bold text-lg">
                        {formatCPV(cpv)}
                      </div>
                      <div className="text-xs mt-1">
                        Price ÷ Avg. Views (12m)
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Charts Section */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Charts</CardTitle>
              <CardDescription>
                Visual comparison of channel metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4 flex-wrap">
                  <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
                  <TabsTrigger value="views30d">Views (30d)</TabsTrigger>
                  <TabsTrigger value="views12m">Views (12m)</TabsTrigger>
                  <TabsTrigger value="cpv">Cost Per View</TabsTrigger>
                </TabsList>
                
                <TabsContent value="subscribers">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={channelsData.map((channel, index) => ({
                          name: channel.channelInfo.snippet.title,
                          value: channel.metrics.subscribers,
                          fill: `hsl(${index * 60}, 70%, 50%)`
                        }))}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatNumber(value)} />
                        <Bar dataKey="value" name="Subscribers" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
                
                <TabsContent value="views30d">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={channelsData.map((channel, index) => ({
                          name: channel.channelInfo.snippet.title,
                          value: channel.metrics.avgViewsLast30Days,
                          fill: `hsl(${index * 60}, 70%, 50%)`
                        }))}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatNumber(value)} />
                        <Bar dataKey="value" name="Avg. Views (30 Days)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
                
                <TabsContent value="views12m">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={channelsData.map((channel, index) => ({
                          name: channel.channelInfo.snippet.title,
                          value: channel.metrics.avgViewsLast12Months,
                          fill: `hsl(${index * 60}, 70%, 50%)`
                        }))}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatNumber(value)} />
                        <Bar dataKey="value" name="Avg. Views (12 Months)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
                
                <TabsContent value="cpv">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={channelsData.map((channel, index) => ({
                          name: channel.channelInfo.snippet.title,
                          value: calculateCPV(channel.channelId, channel.metrics.avgViewsLast12Months),
                          fill: `hsl(${index * 60}, 70%, 50%)`
                        }))}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCPV(value)} />
                        <Bar dataKey="value" name="Cost Per View" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Total Subscribers</div>
                    <div className="text-2xl font-bold">
                      {formatNumber(channelsData.reduce((sum, channel) => sum + channel.metrics.subscribers, 0))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <Eye className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Total Views</div>
                    <div className="text-2xl font-bold">
                      {formatNumber(channelsData.reduce((sum, channel) => sum + channel.metrics.totalViews, 0))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <Video className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Total Videos</div>
                    <div className="text-2xl font-bold">
                      {formatNumber(channelsData.reduce((sum, channel) => sum + channel.metrics.videoCount, 0))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                    <DollarSign className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Total Est. Value</div>
                    <div className="text-2xl font-bold">
                      {formatCurrency(Object.values(channelPrices).reduce((sum, price) => sum + price, 0))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

