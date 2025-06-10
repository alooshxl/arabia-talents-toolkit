import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppContext } from '@/contexts/AppContext';
import youtubeApiService from '@/services/youtubeApi';
import { formatNumber, parseBulkInput, calculateAverageViews } from '@/utils/helpers';
import { Download } from 'lucide-react';

export default function BulkChannelAnalyzer() {
  const { setLoading, setError } = useAppContext();
  const [channelUrls, setChannelUrls] = useState('');
  const [results, setResults] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!channelUrls.trim()) return;
    
    setIsAnalyzing(true);
    setLoading(true);
    setError(null);
    setResults([]);
    
    try {
      const urls = parseBulkInput(channelUrls);
      
      if (urls.length === 0) {
        throw new Error('No valid URLs provided');
      }
      
      const analysisResults = [];
      
      for (const url of urls) {
        try {
          let channelId = youtubeApiService.extractChannelId(url);
          
          if (!channelId) {
            channelId = await youtubeApiService.getChannelIdFromCustomUrl(url);
          }
          
          if (!channelId) {
            console.error(`Could not find a valid channel ID for URL: ${url}`);
            continue;
          }
          
          const channelInfo = await youtubeApiService.getChannelInfo(channelId);
          const channelVideos = await youtubeApiService.getChannelVideos(channelId, 50);
          const videoIds = channelVideos.map(video => video.id.videoId);
          const videoDetails = await youtubeApiService.getMultipleVideoDetails(videoIds);
          
          const avgViewsLast30Days = calculateAverageViews(videoDetails.filter(video => {
            const publishDate = new Date(video.snippet.publishedAt);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return publishDate >= thirtyDaysAgo;
          }));
          const avgViews12Months = calculateAverageViews(videoDetails.filter(video => {
            const publishDate = new Date(video.snippet.publishedAt);
            const twelveMonthsAgo = new Date();
            twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
            return publishDate >= twelveMonthsAgo;
          }));
          
          analysisResults.push({
            channelName: channelInfo.snippet.title,
            channelUrl: url,
            subscriberCount: parseInt(channelInfo.statistics.subscriberCount),
            country: channelInfo.snippet.country || 'Unknown',
            avgViewsLast30Days,
            avgViews12Months,
            contentType: 'Unknown' // Placeholder for content type
          });
        } catch (error) {
          console.error(`Error processing channel URL: ${url}`, error);
        }
      }
      
      setResults(analysisResults);
      
    } catch (error) {
      console.error('Error analyzing channels:', error);
      setError(error.message || 'Failed to analyze channels. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (results.length === 0) return;

    const headers = [
      'Channel Name',
      'URL',
      'Subscribers',
      'Country',
      'Avg. Views (Last 30 Days)',
      'Avg. Views (Last 12 Months)',
      'Content Type'
    ];

    const rows = results.map(row => [
      `"${row.channelName.replace(/"/g, '""')}"`,
      `"${row.channelUrl.replace(/"/g, '""')}"`,
      row.subscriberCount,
      `"${row.country.replace(/"/g, '""')}"`,
      row.avgViewsLast30Days,
      row.avgViews12Months,
      `"${row.contentType.replace(/"/g, '""')}"`
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'bulk_channel_analysis.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6">Bulk Channel Analyzer</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Enter YouTube Channel URLs</CardTitle>
          <CardDescription>
            Analyze multiple YouTube channels at once
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
              {isAnalyzing ? 'Analyzing...' : 'Analyze Channels'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Analysis Results</CardTitle>
                <CardDescription>
                  Analyzed {results.length} channels
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
                    <TableHead>Channel Name</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead className="text-right">Subscribers</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">Avg. Views (30 Days)</TableHead>
                    <TableHead className="text-right">Avg. Views (12 Months)</TableHead>
                    <TableHead>Content Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{result.channelName}</TableCell>
                      <TableCell><a href={result.channelUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Link</a></TableCell>
                      <TableCell className="text-right">{formatNumber(result.subscriberCount)}</TableCell>
                      <TableCell>{result.country}</TableCell>
                      <TableCell className="text-right">{formatNumber(result.avgViewsLast30Days)}</TableCell>
                      <TableCell className="text-right">{formatNumber(result.avgViews12Months)}</TableCell>
                      <TableCell>{result.contentType}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

